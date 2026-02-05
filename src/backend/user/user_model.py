from time import time as timestamp
import re
import random
import string
import unicodedata
from urllib import parse
from typing import Any

from backend.libs import log
from backend.cache import cache
from backend import config

from backend.user.user_data_type import UserData
from web_api.exceptions import APIException


class User:
    _data: UserData

    def __init__(self, user_data: UserData):
        self.id = user_data["id"]
        self._data = user_data

    def get_tuned_in_sid(self) -> int | None:
        if "sid" in self.data and self.data["sid"]:
            return self.data["sid"]
        lrecord = self.get_listener_record()
        if lrecord and "sid" in lrecord:
            return lrecord["sid"]
        return None

    def refresh(self, sid: int) -> None:
        self.data["tuned_in"] = False
        listener = self.get_listener_record(use_cache=False)
        if listener:
            if self.data["sid"] == sid:
                self.data["tuned_in"] = True
            else:
                self.data["sid"] = sid
        else:
            self.data["sid"] = sid

        if (self.id > 1) and cache.get_station(sid, "sched_current"):
            self.data["request_position"] = self.get_request_line_position(
                self.data["sid"]
            )
            self.data["request_expires_at"] = self.get_request_expiry()

            if (
                self.data["tuned_in"]
                and not self.is_in_request_line()
                and self.has_requests()
            ):
                self.put_in_request_line(self.data["sid"])

        if self.data["lock"] and sid != self.data["lock_sid"]:
            self.data["lock_in_effect"] = True

    def to_private_dict(self) -> dict[str, Any]:
        """
        Returns a JSONable dict containing data that the user will want to see or make use of.
        NOT for other users to see.
        """
        return self.data

    def is_tunedin(self) -> bool:
        return self.data["tuned_in"]

    def is_admin(self) -> bool:
        return self.data["admin"] > 0

    def has_perks(self) -> bool:
        return self.data["perks"]

    def is_anonymous(self) -> bool:
        return self.id <= 1

    def has_requests(self, sid: int | bool = False) -> bool | int:
        if self.id <= 1:
            return False
        elif sid:
            return (
                db.c.fetch_var(
                    "SELECT COUNT(*) FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND sid = %s",
                    (self.id, sid),
                )
                or 0
            )
        else:
            return (
                db.c.fetch_var(
                    "SELECT COUNT(*) FROM r4_request_store WHERE user_id = %s",
                    (self.id,),
                )
                or 0
            )

    def _check_too_many_requests(self) -> int:
        num_reqs = self.has_requests()
        max_reqs = 12
        if self.data["perks"]:
            max_reqs = 24
        if num_reqs >= max_reqs:
            raise APIException("too_many_requests")
        return max_reqs - num_reqs

    def add_request(self, sid: int, song_id: int) -> int:
        song = playlist.Song.load_from_id(song_id, sid)
        for requested in db.c.fetch_all(
            "SELECT r4_request_store.song_id, r4_songs.album_id FROM r4_request_store JOIN r4_songs USING (song_id) WHERE r4_request_store.user_id = %s",
            (self.id,),
        ):
            if song.id == requested["song_id"]:
                raise APIException("same_request_exists")
            if not self.has_perks() and song.album:
                if song.album.id == requested["album_id"]:
                    raise APIException("same_request_album")
        self._check_too_many_requests()
        updated_rows = db.c.update(
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
            added_requests += db.c.update(
                "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                (self.id, song_id, sid),
            )
        if added_requests < limit:
            for song_id in playlist.get_unrated_songs_on_cooldown_for_requesting(
                self.id, sid, limit - added_requests
            ):
                added_requests += db.c.update(
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
                added_requests += db.c.update(
                    "INSERT INTO r4_request_store (user_id, song_id, sid) VALUES (%s, %s, %s)",
                    (self.id, song_id, sid),
                )
        if added_requests > 0:
            self.put_in_request_line(sid)
        return added_requests

    def remove_request(self, song_id: int) -> int:
        song_requested = db.c.fetch_var(
            "SELECT reqstor_id FROM r4_request_store WHERE user_id = %s AND song_id = %s",
            (self.id, song_id),
        )
        if not song_requested:
            raise APIException("song_not_requested")
        return db.c.update(
            "DELETE FROM r4_request_store WHERE user_id = %s AND song_id = %s",
            (self.id, song_id),
        )

    def clear_all_requests(self) -> int:
        return db.c.update(
            "DELETE FROM r4_request_store WHERE user_id = %s", (self.id,)
        )

    def clear_all_requests_on_cooldown(self) -> int:
        return db.c.update(
            "DELETE FROM r4_request_store USING r4_song_sid WHERE r4_song_sid.song_id = r4_request_store.song_id AND r4_song_sid.sid = r4_request_store.sid AND user_id = %s AND song_cool_end > %s",
            (
                self.id,
                timestamp() + (20 * 60),
            ),
        )

    def pause_requests(self) -> bool:
        self.remove_from_request_line()
        if (
            db.c.update(
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
            db.c.update(
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
        if self.id <= 1 or not sid:
            return False
        else:
            # this function may not always be called when all user data is loaded, so this has to be a DB operation
            # don't add to the line if the user is paused
            if db.c.fetch_var(
                "SELECT radio_requests_paused FROM phpbb_users WHERE user_id = %s",
                (self.id,),
            ):
                return False
            already_lined = db.c.fetch_row(
                "SELECT * FROM r4_request_line WHERE user_id = %s", (self.id,)
            )
            if already_lined and already_lined["sid"] == sid:
                if already_lined["line_expiry_tune_in"]:
                    db.c.update(
                        "UPDATE r4_request_line SET line_expiry_tune_in = NULL WHERE user_id = %s",
                        (self.id,),
                    )
                return True
            elif already_lined:
                self.remove_from_request_line()
            has_valid = True if self.get_top_request_song_id(sid) else False
            return (
                db.c.update(
                    "INSERT INTO r4_request_line (user_id, sid, line_has_had_valid) VALUES (%s, %s, %s)",
                    (self.id, sid, has_valid),
                )
                > 0
            )

    def remove_from_request_line(self) -> bool:
        return (
            db.c.update("DELETE FROM r4_request_line WHERE user_id = %s", (self.id,))
            > 0
        )

    def is_in_request_line(self) -> bool:
        return (
            db.c.fetch_var(
                "SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s", (self.id,)
            )
            or 0
        ) > 0

    def get_top_request_song_id(self, sid: int) -> int | None:
        return db.c.fetch_var(
            "SELECT song_id FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE AND song_cool = FALSE AND song_elec_blocked = FALSE ORDER BY reqstor_order, reqstor_id LIMIT 1",
            (self.id, sid),
        )

    def get_top_request_song_id_any(self, sid: int) -> int | None:
        return db.c.fetch_var(
            "SELECT song_id FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE ORDER BY reqstor_order, reqstor_id LIMIT 1",
            (self.id, sid),
        )

    def get_request_line_sid(self) -> int | None:
        return db.c.fetch_var(
            "SELECT sid FROM r4_request_line WHERE user_id = %s", (self.id,)
        )

    def get_request_line_position(self, sid: int) -> int | None:
        if self.id <= 1:
            return None
        request_user_positions = cache.get_station(sid, "request_user_positions")
        if request_user_positions and self.id in request_user_positions:
            return request_user_positions[self.id]
        return None

    def get_request_expiry(self) -> int | None:
        if self.id <= 1:
            return None
        request_expire_times = cache.get("request_expire_times")
        if request_expire_times and self.id in request_expire_times:
            return request_expire_times[self.id]
        return None

    def get_requests(self, sid: int) -> list[dict[str, Any]]:
        if self.id <= 1:
            return []
        requests = db.c.fetch_all(
            "SELECT r4_request_store.song_id AS id, COALESCE(r4_song_sid.sid, r4_request_store.sid) AS sid, r4_songs.song_origin_sid AS origin_sid, "
            "r4_request_store.reqstor_order AS order, r4_request_store.reqstor_id AS request_id, "
            "CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, song_title AS title, song_length AS length, "
            "r4_song_sid.song_cool AS cool, r4_song_sid.song_cool_end AS cool_end, song_exists AS good, "
            "r4_song_sid.song_elec_blocked AS elec_blocked, r4_song_sid.song_elec_blocked_by AS elec_blocked_by, "
            "r4_song_sid.song_elec_blocked_num AS elec_blocked_num, r4_song_sid.song_exists AS valid, "
            "COALESCE(song_rating_user, 0) AS rating_user, COALESCE(album_rating_user, 0) AS album_rating_user, "
            "song_fave AS fave, album_fave AS album_fave, "
            "r4_songs.album_id AS album_id, r4_albums.album_name, r4_album_sid.album_rating AS album_rating, album_rating_complete "
            "FROM r4_request_store "
            "JOIN r4_songs USING (song_id) "
            "JOIN r4_albums USING (album_id) "
            "JOIN r4_album_sid ON (r4_albums.album_id = r4_album_sid.album_id AND r4_request_store.sid = r4_album_sid.sid) "
            "LEFT JOIN r4_song_sid ON (r4_request_store.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s) "
            "LEFT JOIN r4_song_ratings ON (r4_request_store.song_id = r4_song_ratings.song_id AND r4_song_ratings.user_id = %s) "
            "LEFT JOIN r4_album_ratings ON (r4_songs.album_id = r4_album_ratings.album_id AND r4_album_ratings.user_id = %s AND r4_album_ratings.sid = %s) "
            "LEFT JOIN r4_album_faves ON (r4_songs.album_id = r4_album_faves.album_id AND r4_album_faves.user_id = %s) "
            "WHERE r4_request_store.user_id = %s "
            "ORDER BY reqstor_order, reqstor_id",
            (sid, self.id, self.id, sid, self.id, self.id),
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
        return db.c.update(
            "UPDATE r4_listeners SET line_expiry_tunein = %s WHERE user_id = %s",
            (t, self.id),
        )

    def lock_to_sid(self, sid: int, lock_count: int) -> int:
        self.data["lock"] = True
        self.data["lock_sid"] = sid
        self.data["lock_counter"] = lock_count
        return db.c.update(
            "UPDATE r4_listeners SET listener_lock = TRUE, listener_lock_sid = %s, listener_lock_counter = %s WHERE listener_id = %s",
            (sid, lock_count, self.data["listener_id"]),
        )

    def update(self, data: dict[str, Any]) -> None:
        self.data.update(data)

    def generate_listen_key(self) -> None:
        listen_key = "".join(
            random.choice(
                string.ascii_uppercase + string.digits + string.ascii_lowercase
            )
            for x in range(10)
        )
        db.c.update(
            "UPDATE phpbb_users SET radio_listenkey = %s WHERE user_id = %s",
            (listen_key, self.id),
        )
        self.update({"radio_listen_key": listen_key})

    def ensure_api_key(self) -> str:
        api_key = None
        if self.id == 1:
            if self.data.get("api_key") and self.data["listen_key"]:
                return self.data["api_key"]
            api_key = self.generate_api_key(
                int(timestamp()) + 172800, self.data.get("api_key")
            )
            cache_key = unicodedata.normalize(
                "NFKD", "api_key_listen_key_%s" % api_key
            ).encode("ascii", "ignore")
            cache.set_global(cache_key, self.data["listen_key"])
        elif self.id > 1:
            if "api_key" in self.data and self.data["api_key"]:
                return self.data["api_key"]

            api_key = db.c.fetch_var(
                "SELECT api_key FROM r4_api_keys WHERE user_id = %s", (self.id,)
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
            db.c.update(
                "DELETE FROM r4_api_keys WHERE api_key = %s AND user_id = 1", (reuse,)
            )
        db.c.update(
            "INSERT INTO r4_api_keys (user_id, api_key, api_expiry, api_key_listen_key) VALUES (%s, %s, %s, %s)",
            (self.id, api_key, expiry, listen_key),
        )
        if self.id == 1:
            self.data["listen_key"] = listen_key
        else:
            # this function updates the API key cache for us
            self.get_all_api_keys()
        return api_key

    def save_preferences(self, ip_addr: str, prefs_json_string: str | None) -> None:
        if not config.store_prefs or not prefs_json_string:
            return

        try:
            prefs_json_string = parse.unquote(prefs_json_string)
            if self.id > 1:
                if not db.c.fetch_var(
                    "SELECT COUNT(*) FROM r4_pref_storage WHERE user_id = %s",
                    (self.id,),
                ):
                    db.c.update(
                        "INSERT INTO r4_pref_storage (user_id, prefs) VALUES (%s, %s::jsonb)",
                        (self.id, prefs_json_string),
                    )
                else:
                    db.c.update(
                        "UPDATE r4_pref_storage SET prefs = %s::jsonb WHERE user_id = %s",
                        (prefs_json_string, self.id),
                    )
            else:
                if not db.c.fetch_var(
                    "SELECT COUNT(*) FROM r4_pref_storage WHERE ip_address = %s AND user_id = %s",
                    (ip_addr, self.id),
                ):
                    db.c.update(
                        "INSERT INTO r4_pref_storage (user_id, ip_address, prefs) VALUES (%s, %s, %s::jsonb)",
                        (self.id, ip_addr, prefs_json_string),
                    )
                else:
                    db.c.update(
                        "UPDATE r4_pref_storage SET prefs = %s::jsonb WHERE ip_address = %s AND user_id = %s",
                        (prefs_json_string, ip_addr, self.id),
                    )
        except Exception as e:
            if "name" in self.data:
                log.exception(
                    "store_prefs",
                    "Could not store user preferences for %s (ID %s)"
                    % (self.data["name"], self.id),
                    e,
                )
            else:
                log.exception(
                    "store_prefs",
                    "Could not store user preferences for anonymous user from IP %s"
                    % ip_addr,
                    e,
                )
