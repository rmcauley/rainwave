import random
import string
from time import time as timestamp
from common import config
from common.db.cursor import RainwaveCursor
from common import log
from common.listeners.get_lock_in_effect import get_lock_in_effect
from common.playlist.song.model.song_on_station import SongOnStation
from common.requests.get_user_request_count import get_request_count_for_any_station
from common.requests.get_user_top_request import get_top_request_song
from common.requests.put_user_in_request_line import put_user_in_request_line
from common.requests.remove_user_from_request_line import remove_user_from_request_line
from common.requests.request_expiry_times import get_request_expire_times
from common.requests.request_line_types import (
    LINE_ENTRY_SQL_FOR_USER_ID,
    RequestLineSqlRow,
)
from common.requests.request_user_positions import get_request_user_positions
from common.user.get_favourited_songs_for_requesting import (
    get_favorited_songs_for_requesting,
)
from common.user.get_unrated_songs_for_requesting import (
    get_unrated_songs_for_requesting,
    get_unrated_songs_on_cooldown_for_requesting,
)
from common.user.solve_avatar import solve_avatar

from common.db.cursor import RainwaveCursor
from common.user.model.user_data_types import (
    RequestStoreRow,
    UserPrivateData,
    UserPublicData,
    UserRefreshDataRow,
    UserServerData,
)
from api.exceptions import APIException
from .user_base import UserBase


class RegisteredUser(UserBase):
    @staticmethod
    async def get_refreshed_data(
        cursor: RainwaveCursor, sid: int, user_id: int, api_key: str
    ) -> tuple[UserPublicData, UserPrivateData, UserServerData]:
        refresh_data = await cursor.fetch_row(
            """
            SELECT 
                phpbb_users.user_id AS id, 
                COALESCE(radio_username, username) AS name, 
                user_avatar AS avatar, 
                radio_requests_paused AS requests_paused,
                user_avatar_type AS avatar_type, 
                radio_listenkey AS listen_key, 
                group_id, 
                radio_totalratings AS total_ratings, 
                listener_id, 
                r4_listeners.sid AS listener_sid, 
                listener_lock, 
                listener_lock_sid, 
                listener_lock_counter, 
                listener_voted_entry
            FROM r4_api_keys 
                JOIN phpbb_users USING (user_id)
                LEFT JOIN r4_listeners ON (
                    r4_api_keys.user_id = r4_listeners.user_id
                    AND listener_purge = FALSE
                )
            WHERE r4_api_keys.user_id = %s AND r4_api_keys.api_key = %s
            """,
            (user_id, api_key),
            row_type=UserRefreshDataRow,
        )

        if not refresh_data:
            log.debug(
                "auth", "Invalid user ID %s and/or API key %s." % (user_id, api_key)
            )
            raise APIException("auth_failed")

        avatar = solve_avatar(refresh_data["avatar_type"], refresh_data["avatar"])
        perks = refresh_data["group_id"] in (5, 4, 8, 18)
        admin = refresh_data["group_id"] in (5, 18)
        rate_anything = (
            perks or refresh_data["total_ratings"] > config.rating_allow_all_threshold
        )
        request_expires_at = (await get_request_expire_times()).get(user_id)
        request_position = (await get_request_user_positions(sid)).get(user_id)
        tuned_in = (
            refresh_data["listener_sid"] is not None
            and refresh_data["listener_sid"] == sid
        )

        return (
            {"avatar": avatar, "id": user_id, "name": refresh_data["name"]},
            {
                "admin": admin,
                "listen_key": refresh_data["listen_key"],
                "lock": refresh_data["listener_lock"] or False,
                "lock_counter": refresh_data["listener_lock_counter"],
                "lock_in_effect": get_lock_in_effect(
                    sid,
                    refresh_data["listener_lock"],
                    refresh_data["listener_lock_sid"],
                    refresh_data["listener_lock_counter"],
                ),
                "lock_sid": refresh_data["listener_lock_sid"],
                "perks": perks,
                "rate_anything": rate_anything,
                "request_expires_at": request_expires_at,
                "request_position": request_position,
                "requests_paused": refresh_data["requests_paused"],
                "tuned_in": tuned_in,
                "voted_entry": refresh_data["listener_voted_entry"],
            },
            {
                "group_id": refresh_data["group_id"],
                "listener_id": refresh_data["listener_id"],
                "listener_sid": refresh_data["listener_sid"],
            },
        )

    def get_max_request_slots(self) -> int:
        return 24 if self.private_data["perks"] else 12

    async def get_remaining_request_slots(self, cursor: RainwaveCursor) -> int:
        return (
            await get_request_count_for_any_station(cursor, self.id)
        ) - self.get_max_request_slots()

    async def add_request(
        self, cursor: RainwaveCursor, song_on_station: SongOnStation
    ) -> int:
        requested_rows = await cursor.fetch_all(
            "SELECT r4_request_store.song_id, r4_songs.album_id FROM r4_request_store JOIN r4_songs USING (song_id) WHERE r4_request_store.user_id = %s",
            (self.id,),
            row_type=RequestStoreRow,
        )
        if len(requested_rows) >= self.get_max_request_slots():
            raise APIException("too_many_requests")
        for requested in requested_rows:
            if song_on_station.id == requested["song_id"]:
                raise APIException("same_request_exists")
            if (
                not self.has_perks()
                and song_on_station.data["album_id"] == requested["album_id"]
            ):
                raise APIException("same_request_album")
        updated_rows = await cursor.update(
            "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
            (self.id, song_on_station.id, song_on_station.sid),
        )
        await self.put_in_request_line_if_necessary(cursor, song_on_station.sid)
        return updated_rows

    async def add_unrated_requests(
        self,
        cursor: RainwaveCursor,
        sid: int,
    ) -> int:
        limit = await self.get_remaining_request_slots(cursor)
        added_requests = 0
        for song_id in await get_unrated_songs_for_requesting(
            cursor, self.id, sid, limit
        ):
            added_requests += await cursor.update(
                "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                (self.id, song_id, sid),
            )
        if added_requests < limit:
            for song_id in await get_unrated_songs_on_cooldown_for_requesting(
                cursor, self.id, sid, limit - added_requests
            ):
                added_requests += await cursor.update(
                    "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                    (self.id, song_id, sid),
                )
        await self.put_in_request_line_if_necessary(cursor, sid)
        return added_requests

    async def add_favorited_requests(self, cursor: RainwaveCursor, sid: int) -> int:
        limit = await self.get_remaining_request_slots(cursor)
        added_requests = 0
        for song_id in await get_favorited_songs_for_requesting(
            cursor, self.id, sid, limit
        ):
            if song_id:
                added_requests += await cursor.update(
                    "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                    (self.id, song_id, sid),
                )
        await self.put_in_request_line_if_necessary(cursor, sid)
        return added_requests

    async def remove_request(self, cursor: RainwaveCursor, song_id: int) -> int:
        song_requested = await cursor.fetch_var(
            "SELECT reqstor_id FROM r4_request_store WHERE user_id = %s AND song_id = %s",
            (self.id, song_id),
            var_type=int,
        )
        if not song_requested:
            raise APIException("song_not_requested")
        return await cursor.update(
            "DELETE FROM r4_request_store WHERE user_id = %s AND song_id = %s",
            (self.id, song_id),
        )

    async def clear_all_requests(self, cursor: RainwaveCursor) -> int:
        return await cursor.update(
            "DELETE FROM r4_request_store WHERE user_id = %s", (self.id,)
        )

    async def clear_all_requests_on_cooldown(self, cursor: RainwaveCursor) -> int:
        return await cursor.update(
            "DELETE FROM r4_request_store USING r4_song_sid WHERE r4_song_sid.song_id = r4_request_store.song_id AND r4_song_sid.sid = r4_request_store.sid AND user_id = %s AND song_cool_end > %s",
            (
                self.id,
                timestamp() + (20 * 60),
            ),
        )

    async def pause_requests(self, cursor: RainwaveCursor) -> bool:
        await remove_user_from_request_line(cursor, self.id)
        if (
            await cursor.update(
                "UPDATE phpbb_users SET radio_requests_paused = TRUE WHERE user_id = %s",
                (self.id,),
            )
            != 0
        ):
            self.private_data["requests_paused"] = True
            return True
        return False

    async def unpause_requests(self, cursor: RainwaveCursor, sid: int) -> bool:
        if (
            await cursor.update(
                "UPDATE phpbb_users SET radio_requests_paused = FALSE WHERE user_id = %s",
                (self.id,),
            )
            != 0
        ):
            self.private_data["requests_paused"] = False
            if await get_request_count_for_any_station(cursor, self.id) > 0:
                await self.put_in_request_line_if_necessary(cursor, sid)
            return True
        return False

    async def put_in_request_line_if_necessary(
        self, cursor: RainwaveCursor, sid: int
    ) -> None:
        if self.private_data["requests_paused"]:
            return

        existing_line_entry = await cursor.fetch_row(
            LINE_ENTRY_SQL_FOR_USER_ID, {"user_id": self.id}, row_type=RequestLineSqlRow
        )
        has_available_song = (
            True if await get_top_request_song(cursor, self.id, sid) else False
        )
        await put_user_in_request_line(
            cursor,
            self.id,
            self.private_data["requests_paused"],
            sid,
            has_available_song,
            existing_line_entry,
        )

    async def generate_listen_key(self, cursor: RainwaveCursor) -> str:
        listen_key = "".join(
            random.choice(
                string.ascii_uppercase + string.digits + string.ascii_lowercase
            )
            for _ in range(10)
        )
        await cursor.update(
            "UPDATE phpbb_users SET radio_listenkey = %s WHERE user_id = %s",
            (listen_key, self.id),
        )
        self.private_data["listen_key"] = listen_key
        return listen_key
