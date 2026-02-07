from typing import TypedDict
from backend import config
from backend.db.cursor import RainwaveCursor
from backend.libs import log
from backend.listeners.get_lock_in_effect import get_lock_in_effect
from backend.requests.request_expiry_times import get_request_expire_times
from backend.requests.request_user_positions import get_request_user_positions
from backend.user.solve_avatar import solve_avatar

from typing import TypedDict

from backend.db.cursor import RainwaveCursor
from backend.user.model.user_data_type import (
    UserPrivateData,
    UserPublicData,
    UserServerData,
)
from web_api.exceptions import APIException
from .user_base import UserBase


class RegisteredUserRefreshDataRow(TypedDict):
    avatar_type: str
    avatar: str
    discord_user_id: str | None
    group_id: int
    id: int
    listen_key: str
    listener_id: int | None
    listener_lock_counter: int | None
    listener_lock_sid: int | None
    listener_lock: bool | None
    listener_sid: int | None
    listener_voted_entry: int | None
    name: str
    requests_paused: bool
    total_ratings: int


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
                discord_user_id AS discord_user_id,
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
            row_type=RegisteredUserRefreshDataRow,
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
        # uses_oauth = True if refresh_data["discord_user_id"] else False
        request_expires_at = (await get_request_expire_times()).get(user_id)
        request_position = (await get_request_user_positions()).get(user_id)
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

    async def get_request_count_for_station(
        self, cursor: RainwaveCursor, sid: int
    ) -> bool:
        return (
            await cursor.fetch_guaranteed(
                "SELECT COUNT(*) FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND sid = %s",
                (self.id, sid),
                default=0,
                var_type=int,
            )
        ) > 0

    async def get_request_count_for_any_station(self, cursor: RainwaveCursor) -> bool:
        return (
            await cursor.fetch_guaranteed(
                "SELECT COUNT(*) FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s",
                (self.id,),
                default=0,
                var_type=int,
            )
        ) > 0

    async def get_remaining_request_slots(self, cursor: RainwaveCursor) -> int:
        num_reqs = await self.get_request_count_for_any_station(cursor)
        max_reqs = 24 if self.private_data["perks"] else 12
        if num_reqs >= max_reqs:
            raise APIException("too_many_requests")
        return max_reqs - num_reqs

    def add_request(self, sid: int, song_id: int) -> int:
        song = playlist.Song.load_from_id(song_id, sid)
        for requested in await cursor.fetch_all(
            "SELECT r4_request_store.song_id, r4_songs.album_id FROM r4_request_store JOIN r4_songs USING (song_id) WHERE r4_request_store.user_id = %s",
            (self.id,),
            row_type=RequestStoreRow,
        ):
            if song.id == requested["song_id"]:
                raise APIException("same_request_exists")
            if not self.has_perks() and song.album:
                if song.album.id == requested["album_id"]:
                    raise APIException("same_request_album")
        self._check_too_many_requests()
        updated_rows = await cursor.update(
            "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
            (self.id, song_id, sid),
        )
        if self.data["sid"] == sid and self.is_tunedin():
            self.put_in_request_line(sid)
        return updated_rows

    def add_unrated_requests(self, sid: int, limit: int | None = None) -> int:
        max_limit = self._check_too_many_requests()
        if not limit:
            limit = max_limit
        elif max_limit > limit:
            limit = max_limit
        added_requests = 0
        for song_id in playlist.get_unrated_songs_for_requesting(self.id, sid, limit):
            added_requests += await cursor.update(
                "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                (self.id, song_id, sid),
            )
        if added_requests < limit:
            for song_id in playlist.get_unrated_songs_on_cooldown_for_requesting(
                self.id, sid, limit - added_requests
            ):
                added_requests += await cursor.update(
                    "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                    (self.id, song_id, sid),
                )
        if added_requests > 0:
            self.put_in_request_line(sid)
        return added_requests

    def add_favorited_requests(self, sid: int, limit: int | None = None) -> int:
        max_limit = self._check_too_many_requests()
        if not limit:
            limit = max_limit
        elif max_limit > limit:
            limit = max_limit
        added_requests = 0
        for song_id in playlist.get_favorited_songs_for_requesting(self.id, sid, limit):
            if song_id:
                added_requests += await cursor.update(
                    "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                    (self.id, song_id, sid),
                )
        if added_requests > 0:
            self.put_in_request_line(sid)
        return added_requests

    def remove_request(self, song_id: int) -> int:
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

    def clear_all_requests(self) -> int:
        return await cursor.update(
            "DELETE FROM r4_request_store WHERE user_id = %s", (self.id,)
        )

    def clear_all_requests_on_cooldown(self) -> int:
        return await cursor.update(
            "DELETE FROM r4_request_store USING r4_song_sid WHERE r4_song_sid.song_id = r4_request_store.song_id AND r4_song_sid.sid = r4_request_store.sid AND user_id = %s AND song_cool_end > %s",
            (
                self.id,
                timestamp() + (20 * 60),
            ),
        )

    def pause_requests(self) -> bool:
        self.remove_from_request_line()
        if (
            await cursor.update(
                "UPDATE phpbb_users SET radio_requests_paused = TRUE WHERE user_id = %s",
                (self.id,),
            )
            != 0
        ):
            self.data["requests_paused"] = True
            return True
        return False

    def unpause_requests(self, sid: int) -> bool:
        if (
            await cursor.update(
                "UPDATE phpbb_users SET radio_requests_paused = FALSE WHERE user_id = %s",
                (self.id,),
            )
            != 0
        ):
            self.data["requests_paused"] = False
            self.put_in_request_line(sid)
            return True
        return False

    def put_in_request_line(self, sid: int) -> bool:
        if not sid:
            return False
        if await cursor.fetch_var(
            "SELECT radio_requests_paused FROM phpbb_users WHERE user_id = %s",
            (self.id,),
            var_type=bool,
        ):
            return False
        already_lined = await cursor.fetch_row(
            "SELECT * FROM r4_request_line WHERE user_id = %s",
            (self.id,),
            row_type=RequestLineRow,
        )
        if already_lined and already_lined["sid"] == sid:
            if already_lined["line_expiry_tune_in"]:
                await cursor.update(
                    "UPDATE r4_request_line SET line_expiry_tune_in = NULL WHERE user_id = %s",
                    (self.id,),
                )
            return True
        if already_lined:
            self.remove_from_request_line()
        has_valid = True if self.get_top_request_song_id(sid) else False
        return (
            await cursor.update(
                "INSERT INTO r4_request_line (user_id, sid, line_has_had_valid) VALUES (%s, %s, %s)",
                (self.id, sid, has_valid),
            )
            > 0
        )

    def remove_from_request_line(self) -> bool:
        return (
            await cursor.update(
                "DELETE FROM r4_request_line WHERE user_id = %s", (self.id,)
            )
            > 0
        )

    def is_in_request_line(self) -> bool:
        return (
            await cursor.fetch_var(
                "SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s",
                (self.id,),
                var_type=int,
            )
            or 0
        ) > 0

    def get_top_request_song_id(self, sid: int) -> int | None:
        return await cursor.fetch_var(
            "SELECT song_id FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE AND song_cool = FALSE AND song_elec_blocked = FALSE ORDER BY reqstor_order, reqstor_id LIMIT 1",
            (self.id, sid),
            var_type=int,
        )

    def get_top_request_song_id_any(self, sid: int) -> int | None:
        return await cursor.fetch_var(
            "SELECT song_id FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE ORDER BY reqstor_order, reqstor_id LIMIT 1",
            (self.id, sid),
            var_type=int,
        )

    def get_request_line_sid(self) -> int | None:
        return await cursor.fetch_var(
            "SELECT sid FROM r4_request_line WHERE user_id = %s",
            (self.id,),
            var_type=int,
        )

    def get_request_line_position(self, sid: int) -> int | None:
        request_user_positions = cache.get_station(sid, "request_user_positions")
        if request_user_positions and self.id in request_user_positions:
            return request_user_positions[self.id]
        return None

    def get_request_expiry(self) -> int | None:
        request_expire_times = cache.get("request_expire_times")
        if request_expire_times and self.id in request_expire_times:
            return request_expire_times[self.id]
        return None

    def get_requests(self, sid: int) -> list[dict[str, Any]]:
        requests = await cursor.fetch_all(
            """
            SELECT
                r4_request_store.song_id AS id,
                COALESCE(r4_song_sid.sid, r4_request_store.sid) AS sid,
                r4_songs.song_origin_sid AS origin_sid,
                r4_request_store.reqstor_order AS order,
                r4_request_store.reqstor_id AS request_id,
                CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating,
                song_title AS title,
                song_length AS length,
                r4_song_sid.song_cool AS cool,
                r4_song_sid.song_cool_end AS cool_end,
                song_exists AS good,
                r4_song_sid.song_elec_blocked AS elec_blocked,
                r4_song_sid.song_elec_blocked_by AS elec_blocked_by,
                r4_song_sid.song_elec_blocked_num AS elec_blocked_num,
                r4_song_sid.song_exists AS valid,
                COALESCE(song_rating_user, 0) AS rating_user,
                COALESCE(album_rating_user, 0) AS album_rating_user,
                song_fave AS fave,
                album_fave AS album_fave,
                r4_songs.album_id AS album_id,
                r4_albums.album_name,
                r4_album_sid.album_rating AS album_rating,
                album_rating_complete
            FROM r4_request_store
                JOIN r4_songs USING (song_id)
                JOIN r4_albums USING (album_id)
                JOIN r4_album_sid ON (
                    r4_albums.album_id = r4_album_sid.album_id 
                    AND r4_request_store.sid = r4_album_sid.sid
                )
                LEFT JOIN r4_song_sid ON (
                    r4_request_store.song_id = r4_song_sid.song_id 
                    AND r4_song_sid.sid = %s
                )
                LEFT JOIN r4_song_ratings ON (
                    r4_request_store.song_id = r4_song_ratings.song_id 
                    AND r4_song_ratings.user_id = %s
                )
                LEFT JOIN r4_album_ratings ON (
                    r4_songs.album_id = r4_album_ratings.album_id 
                    AND r4_album_ratings.user_id = %s 
                    AND r4_album_ratings.sid = %s
                )
                LEFT JOIN r4_album_faves ON (
                    r4_songs.album_id = r4_album_faves.album_id 
                    AND r4_album_faves.user_id = %s
                )
            WHERE r4_request_store.user_id = %s
            ORDER BY reqstor_order, reqstor_id
""",
            (sid, self.id, self.id, sid, self.id, self.id),
            row_type=RequestSongRow,
        )
        if not requests:
            requests = []
        for song in requests:
            if (
                not song["valid"]
                or song["cool"]
                or song["elec_blocked"]
                or song["sid"] != sid
            ):
                song["valid"] = False
            else:
                song["valid"] = True
            song["albums"] = [
                {
                    "name": song.pop("album_name"),
                    "id": song["album_id"],
                    "fave": song.pop("album_fave"),
                    "rating": round(song.pop("album_rating"), 1),
                    "rating_user": song.pop("album_rating_user"),
                    "rating_complete": song.pop("album_rating_complete"),
                    "art": playlist.Album.get_art_url(
                        song.pop("album_id"), song["sid"]
                    ),
                }
            ]
        return requests

    def set_request_tunein_expiry(self, t: int | None = None) -> int | None:
        if not self.is_in_request_line():
            return None
        if not t:
            t = timestamp() + config.request_tunein_timeout
        return await cursor.update(
            "UPDATE r4_listeners SET line_expiry_tunein = %s WHERE user_id = %s",
            (t, self.id),
        )

    def generate_listen_key(self) -> None:
        listen_key = "".join(
            random.choice(
                string.ascii_uppercase + string.digits + string.ascii_lowercase
            )
            for x in range(10)
        )
        await cursor.update(
            "UPDATE phpbb_users SET radio_listenkey = %s WHERE user_id = %s",
            (listen_key, self.id),
        )
        self.update({"radio_listen_key": listen_key})

    def ensure_api_key(self) -> str:
        api_key = None
        if "api_key" in self.data and self.data["api_key"]:
            return self.data["api_key"]

        api_key = await cursor.fetch_var(
            "SELECT api_key FROM r4_api_keys WHERE user_id = %s",
            (self.id,),
            var_type=str,
        )
        if not api_key:
            api_key = self.generate_api_key()
        self.data["api_key"] = api_key

        return api_key

    def generate_api_key(
        self, expiry: int | None = None, reuse: str | None = None
    ) -> str:
        api_key = reuse or "".join(
            random.choice(
                string.ascii_uppercase + string.digits + string.ascii_lowercase
            )
            for x in range(10)
        )
        listen_key = "".join(
            random.choice(
                string.ascii_uppercase + string.digits + string.ascii_lowercase
            )
            for x in range(10)
        )
        if reuse:
            await cursor.update(
                "DELETE FROM r4_api_keys WHERE api_key = %s AND user_id = 1", (reuse,)
            )
        await cursor.update(
            "INSERT INTO r4_api_keys (user_id, api_key, api_expiry, api_key_listen_key) VALUES (%s, %s, %s, %s)",
            (self.id, api_key, expiry, listen_key),
        )
        self.get_all_api_keys()
        return api_key
