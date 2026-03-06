from time import time as timestamp
from api.exceptions import APIException
from common import log
from common.db.cursor import RainwaveCursor
from common.listeners.get_lock_in_effect import get_lock_in_effect
from common.playlist.song.model.song_on_station import SongOnStation
from common.user.api_key import generate_api_key_and_listen_key
from common.user.model.user_base import UserBase
from common.user.model.user_data_types import (
    UserPrivateData,
    UserPublicData,
    UserRefreshDataRow,
    UserServerData,
)
from common.user.solve_avatar import DEFAULT_AVATAR


class AnonymousUser(UserBase):
    @staticmethod
    async def get_refreshed_data(
        cursor: RainwaveCursor, sid: int, user_id: int, api_key: str
    ) -> tuple[UserPublicData, UserPrivateData, UserServerData]:
        refresh_data = await cursor.fetch_row(
            """
            SELECT 
                1 AS id, 
                'Anonymous' AS name, 
                NULL AS avatar, 
                FALSE AS requests_paused,
                '' AS avatar_type, 
                api_key_listen_key AS listen_key, 
                0 AS group_id, 
                radio_totalratings AS total_ratings, 
                listener_id, 
                r4_listeners.sid AS listener_sid, 
                listener_lock, 
                listener_lock_sid, 
                listener_lock_counter, 
                listener_voted_entry
            FROM r4_api_keys 
                LEFT JOIN r4_listeners ON (
                    r4_api_keys.api_key_listen_key = r4_listeners.listener_key
                    AND listener_purge = FALSE
                )
            WHERE r4_api_keys.user_id = %s AND r4_api_keys.api_key = %s
            """,
            (user_id, api_key),
            row_type=UserRefreshDataRow,
        )

        if not refresh_data:
            log.debug("auth", "Invalid anonymous API key combination.")
            raise APIException("auth_failed")

        avatar = DEFAULT_AVATAR
        perks = False
        admin = False
        tuned_in = (
            refresh_data["listener_sid"] is not None
            and refresh_data["listener_sid"] == sid
        )

        return (
            {"avatar": avatar, "id": user_id, "name": refresh_data["name"]},
            {
                "api_key": api_key,
                "admin": admin,
                "listen_key": refresh_data["listen_key"],
                "lock": refresh_data["listener_lock"] or False,
                "lock_counter": refresh_data["listener_lock_counter"] or 0,
                "lock_in_effect": get_lock_in_effect(
                    sid,
                    refresh_data["listener_lock"],
                    refresh_data["listener_lock_sid"],
                    refresh_data["listener_lock_counter"],
                ),
                "lock_sid": refresh_data["listener_lock_sid"],
                "perks": perks,
                "rate_anything": False,
                "request_expires_at": None,
                "request_position": None,
                "requests_paused": refresh_data["requests_paused"],
                "sid": sid,
                "tuned_in": tuned_in,
                "voted_entry": refresh_data["listener_voted_entry"],
            },
            {
                "group_id": refresh_data["group_id"],
                "listener_id": refresh_data["listener_id"],
                "listener_sid": refresh_data["listener_sid"],
            },
        )

    @staticmethod
    async def create_anonymous_user_with_api_key(
        cursor: RainwaveCursor, sid: int, ip_address: str
    ) -> AnonymousUser:
        (api_key, listen_key) = await generate_api_key_and_listen_key(
            cursor, 1, int(timestamp()) + 86400
        )
        return AnonymousUser(
            {"avatar": DEFAULT_AVATAR, "id": 1, "name": "Anonymous"},
            {
                "api_key": api_key,
                "admin": False,
                "listen_key": listen_key,
                "lock": False,
                "lock_counter": 0,
                "lock_in_effect": False,
                "lock_sid": None,
                "perks": False,
                "rate_anything": False,
                "request_expires_at": None,
                "request_position": None,
                "requests_paused": False,
                "sid": sid,
                "tuned_in": False,
                "voted_entry": None,
            },
            {
                "group_id": 0,
                "listener_id": None,
                "listener_sid": None,
            },
            ip_address,
        )

    async def get_remaining_request_slots(self, cursor: RainwaveCursor) -> int:
        return 0

    async def add_request(
        self, cursor: RainwaveCursor, song_on_station: SongOnStation
    ) -> int:
        return 0

    async def add_unrated_requests(
        self,
        cursor: RainwaveCursor,
        sid: int,
    ) -> int:
        return 0

    async def add_favorited_requests(
        self,
        cursor: RainwaveCursor,
        sid: int,
    ) -> int:
        return 0

    async def remove_request(self, cursor: RainwaveCursor, song_id: int) -> int:
        return 0

    async def clear_all_requests(self, cursor: RainwaveCursor) -> int:
        return 0

    async def clear_all_requests_on_cooldown(self, cursor: RainwaveCursor) -> int:
        return 0

    async def pause_requests(self, cursor: RainwaveCursor) -> bool:
        return False

    async def unpause_requests(self, cursor: RainwaveCursor, sid: int) -> bool:
        return False

    async def put_in_request_line_if_necessary(
        self, cursor: RainwaveCursor, sid: int
    ) -> None:
        pass
