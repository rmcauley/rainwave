from time import time as timestamp
import random
import string
import unicodedata
from urllib import parse
from abc import ABC, abstractmethod
from typing import Any, TypedDict, TypeAlias

from backend.libs import log
from backend.db.cursor import RainwaveCursor
from backend.cache import cache
from backend import config
from backend.user.solve_avatar import solve_avatar
from backend.user.model.user_data_type import UserData
from backend.user.api_key import check_is_valid_api_key
from web_api.exceptions import APIException
from backend.rainwave import playlist


class RequestStoreRow(TypedDict):
    song_id: int
    album_id: int


class ListenerRecord(TypedDict):
    listener_id: int
    sid: int
    listener_lock: bool
    listener_lock_sid: int | None
    listener_lock_counter: int
    listener_voted_entry: int | None
    listener_key: str | None


class RequestSongRow(TypedDict, total=False):
    id: int
    sid: int
    origin_sid: int
    order: int
    request_id: int
    rating: float
    title: str
    length: int
    cool: bool
    cool_end: int
    good: bool
    elec_blocked: bool
    elec_blocked_by: int | None
    elec_blocked_num: int | None
    valid: bool
    rating_user: float
    album_rating_user: float
    fave: bool
    album_fave: bool
    album_id: int
    album_name: str
    album_rating: float
    album_rating_complete: bool
    albums: list[dict[str, Any]]


class RegisteredUserRow(TypedDict):
    id: int
    name: str
    avatar: str
    requests_paused: bool
    _avatar_type: str
    listen_key: str | None
    _group_id: int
    _total_ratings: int
    _discord_user_id: str | None


class AnonymousUser(UserBase):
    def get_listener_record(self, use_cache: bool = True) -> ListenerRecord | None:
        if not self.ip_address:
            return None
        listener = db.c.fetch_row(
            """
            SELECT 
                listener_id, 
                sid, 
                listener_lock AS lock, 
                listener_lock_sid AS lock_sid, 
                listener_lock_counter AS lock_counter, 
                listener_voted_entry AS voted_entry,
                listener_key AS listen_key
            FROM r4_listeners 
            WHERE listener_ip = %s AND listener_purge = FALSE AND user_id = 1
            """,
            (self.ip_address,),
            row_type=ListenerRecord,
        )
        if listener:
            self.data.update(listener)
        return listener

    def get_all_api_keys(self) -> list[str]:
        return []

    def _auth_anon_user(self, api_key: str | None, bypass: bool = False) -> None:
        if not bypass:
            cache_key = unicodedata.normalize(
                "NFKD", "api_key_listen_key_%s" % api_key
            ).encode("ascii", "ignore")
            listen_key = cache.get(cache_key)
            if not listen_key:
                listen_key = db.c.fetch_var(
                    "SELECT api_key_listen_key FROM r4_api_keys WHERE api_key = %s AND user_id = 1",
                    (self.api_key,),
                    var_type=str,
                )
                if not listen_key:
                    return
                self.data["listen_key"] = listen_key
            else:
                self.data["listen_key"] = listen_key
        self.authorized = True

    def has_requests(self, sid: int | bool = False) -> bool | int:
        return False

    def _check_too_many_requests(self) -> int:
        raise APIException("login_required")

    def add_request(self, sid: int, song_id: int) -> int:
        raise APIException("login_required")

    def add_unrated_requests(self, sid: int, limit: int | None = None) -> int:
        raise APIException("login_required")

    def add_favorited_requests(self, sid: int, limit: int | None = None) -> int:
        raise APIException("login_required")

    def remove_request(self, song_id: int) -> int:
        raise APIException("login_required")

    def clear_all_requests(self) -> int:
        raise APIException("login_required")

    def clear_all_requests_on_cooldown(self) -> int:
        raise APIException("login_required")

    def pause_requests(self) -> bool:
        raise APIException("login_required")

    def unpause_requests(self, sid: int) -> bool:
        raise APIException("login_required")

    def put_in_request_line(self, sid: int) -> bool:
        return False

    def remove_from_request_line(self) -> bool:
        return False

    def is_in_request_line(self) -> bool:
        return False

    def get_top_request_song_id(self, sid: int) -> int | None:
        return None

    def get_top_request_song_id_any(self, sid: int) -> int | None:
        return None

    def get_request_line_sid(self) -> int | None:
        return None

    def get_request_line_position(self, sid: int) -> int | None:
        return None

    def get_request_expiry(self) -> int | None:
        return None

    def get_requests(self, sid: int) -> list[dict[str, Any]]:
        return []

    def set_request_tunein_expiry(self, t: int | None = None) -> int | None:
        return None

    def ensure_api_key(self) -> str:
        if self.data.get("api_key") and self.data.get("listen_key"):
            return self.data["api_key"]
        api_key = self.generate_api_key(
            int(timestamp()) + 172800, self.data.get("api_key")
        )
        cache_key = unicodedata.normalize("NFKD", "api_key_listen_key_%s" % api_key)
        cache.set_global(cache_key.encode("ascii", "ignore"), self.data["listen_key"])
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
            db.c.update(
                "DELETE FROM r4_api_keys WHERE api_key = %s AND user_id = 1", (reuse,)
            )
        db.c.update(
            "INSERT INTO r4_api_keys (user_id, api_key, api_expiry, api_key_listen_key) VALUES (%s, %s, %s, %s)",
            (self.id, api_key, expiry, listen_key),
        )
        self.data["listen_key"] = listen_key
        return api_key


User: TypeAlias = RegisteredUser | AnonymousUser


def make_user(user_data: UserData | int) -> User:
    return UserBase.build(user_data)
