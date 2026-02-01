from time import time as timestamp
import re
import random
import string
import unicodedata
from urllib import parse

from libs import log
from libs import cache
from libs import db
from libs import config

from rainwave import playlist

from api.exceptions import APIException

_AVATAR_PATH = "/forums/download/file.php?avatar=%s"
_DEFAULT_AVATAR = "/static/images4/user.svg"


def trim_listeners(sid):
    db.c.update(
        "DELETE FROM r4_listeners WHERE sid = %s AND listener_purge = TRUE", (sid,)
    )


def unlock_listeners(sid):
    db.c.update(
        "UPDATE r4_listeners SET listener_lock_counter = listener_lock_counter - 1 WHERE listener_lock = TRUE AND listener_lock_sid = %s",
        (sid,),
    )
    db.c.update(
        "UPDATE r4_listeners SET listener_lock = FALSE WHERE listener_lock_counter <= 0"
    )


def solve_avatar(avatar_type, avatar):
    if avatar_type == "avatar.driver.upload":
        return _AVATAR_PATH % avatar
    elif avatar_type == "avatar.driver.remote":
        return avatar
    else:
        return _DEFAULT_AVATAR


class User:
    def __init__(self, user_id: int):
        self.id = user_id
        self.authorized = False
        self.ip_address = None

        self.api_key = False

        self.data = {}
        self.data["admin"] = False
        self.data["tuned_in"] = False
        self.data["perks"] = False
        self.data["request_position"] = 0
        self.data["request_expires_at"] = 0
        self.data["rate_anything"] = False
        self.data["requests_paused"] = False
        self.data["avatar"] = _DEFAULT_AVATAR
        self.data["new_privmsg"] = 0
        self.data["listen_key"] = None
        self.data["id"] = 1
        self.data["name"] = "Anonymous"
        self.data["display_name"] = self.data["name"]
        self.data["sid"] = 0
        self.data["lock"] = False
        self.data["lock_in_effect"] = False
        self.data["lock_sid"] = None
        self.data["lock_counter"] = 0
        self.data["voted_entry"] = 0
        self.data["listener_id"] = 0
        self.data["_group_id"] = None

    def authorize(self, sid, api_key: str | None, bypass=False):
        self.api_key = api_key

        if not bypass and (api_key and not re.match(r"^[\w\d]+$", api_key)):
            print("bad api key")
            return

        if self.id > 1:
            self._auth_registered_user(api_key, bypass)
        else:
            print("auth anon user")
            self._auth_anon_user(api_key, bypass)

    def get_all_api_keys(self):
        if self.id > 1:
            keys = db.c.fetch_list(
                "SELECT api_key FROM r4_api_keys WHERE user_id = %s ", (self.id,)
            )
            cache.set_user(self, "api_keys", keys)
            return keys
        return []

    def _auth_registered_user(self, api_key: str | None, bypass=False):
        if not bypass:
            keys = cache.get_user(self, "api_keys")
            if keys and api_key in keys:
                pass
            elif not api_key in self.get_all_api_keys():
                log.debug(
                    "auth", "Invalid user ID %s and/or API key %s." % (self.id, api_key)
                )
                return

        # Set as authorized and begin populating information
        # Pay attention to the "AS _variable" names in the SQL fields, they won't get exported to private JSONable dict
        self.authorized = True
        user_data = None
        if not user_data:
            user_data = db.c.fetch_row(
                "SELECT user_id AS id, COALESCE(radio_username, username) AS name, user_avatar AS avatar, radio_requests_paused AS requests_paused, "
                "user_avatar_type AS _avatar_type, radio_listenkey AS listen_key, group_id AS _group_id, radio_totalratings AS _total_ratings, discord_user_id AS _discord_user_id "
                "FROM phpbb_users WHERE user_id = %s",
                (self.id,),
            )

        if not user_data:
            log.debug("auth", "Invalid user ID %s not found in DB." % (self.id,))
            return

        self.data.update(user_data)

        self.data["avatar"] = solve_avatar(
            self.data["_avatar_type"], self.data["avatar"]
        )
        self.data.pop("_avatar_type")

        # Privileged folk - donors, admins, etc - get perks.
        # The numbers are the phpBB group IDs.
        if self.data["_group_id"] in (5, 4, 8, 18):
            self.data["perks"] = True

        # Admin and station manager groups
        if self.data["_group_id"] in (5, 18):
            self.data["admin"] = True
        self.data.pop("_group_id")

        if self.data["perks"]:
            self.data["rate_anything"] = True
        elif self.data["_total_ratings"] > config.get("rating_allow_all_threshold"):
            self.data["rate_anything"] = True
        self.data.pop("_total_ratings")

        if not self.data["listen_key"]:
            self.generate_listen_key()

        self.data["uses_oauth"] = True if self.data["_discord_user_id"] else False
        self.data.pop("_discord_user_id")

    def _auth_anon_user(self, api_key: str | None, bypass=False):
        if not bypass:
            print("not bypassing")
            cache_key = unicodedata.normalize(
                "NFKD", "api_key_listen_key_%s" % api_key
            ).encode("ascii", "ignore")
            print("A")
            listen_key = cache.get(cache_key)
            print("B")
            if not listen_key:
                listen_key = db.c.fetch_var(
                    "SELECT api_key_listen_key FROM r4_api_keys WHERE api_key = %s AND user_id = 1",
                    (self.api_key,),
                )
                print("c")
                if not listen_key:
                    print("d")
                    return
                else:
                    print("e")
                    self.data["listen_key"] = listen_key
            else:
                print("f")
                self.data["listen_key"] = listen_key
        print("all should be good!")
        self.authorized = True

    def get_tuned_in_sid(self):
        if "sid" in self.data and self.data["sid"]:
            return self.data["sid"]
        lrecord = self.get_listener_record()
        if lrecord and "sid" in lrecord:
            return lrecord["sid"]
        return None

    def get_listener_record(self, use_cache=True):
        listener = None
        if self.id > 1:
            # listener = cache.get_user(self.id, "listener_record")
            if not listener or not use_cache:
                listener = db.c.fetch_row(
                    "SELECT "
                    "listener_id, sid, listener_lock AS lock, listener_lock_sid AS lock_sid, listener_lock_counter AS lock_counter, listener_voted_entry AS voted_entry "
                    "FROM r4_listeners "
                    "WHERE user_id = %s AND listener_purge = FALSE",
                    (self.id,),
                )
        else:
            listener = db.c.fetch_row(
                "SELECT "
                "listener_id, sid, listener_lock AS lock, listener_lock_sid AS lock_sid, listener_lock_counter AS lock_counter, listener_voted_entry AS voted_entry, listener_key AS listen_key "
                "FROM r4_listeners "
                "WHERE listener_ip = %s AND listener_purge = FALSE AND user_id = 1",
                (self.ip_address,),
            )
        if listener:
            self.data.update(listener)
        # if self.id > 1:
        # cache.set_user(self.id, "listener_record", listener)
        return listener

    def refresh(self, sid):
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

    def to_private_dict(self):
        """
        Returns a JSONable dict containing data that the user will want to see or make use of.
        NOT for other users to see.
        """
        return self.data

    def is_tunedin(self):
        return self.data["tuned_in"]

    def is_admin(self):
        return self.data["admin"] > 0

    def is_dj(self):
        if "dj" in self.data and self.data["dj"]:
            return True
        return False

    def has_perks(self):
        return self.data["perks"]

    def is_anonymous(self):
        return self.id <= 1

    def has_requests(self, sid=False) -> bool | int:
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

    def _check_too_many_requests(self):
        num_reqs = self.has_requests()
        max_reqs = 12
        if self.data["perks"]:
            max_reqs = 24
        if num_reqs >= max_reqs:
            raise APIException("too_many_requests")
        return max_reqs - num_reqs

    def add_request(self, sid, song_id):
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

    def add_unrated_requests(self, sid, limit=None):
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

    def add_favorited_requests(self, sid, limit=None):
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

    def remove_request(self, song_id):
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

    def clear_all_requests(self):
        return db.c.update(
            "DELETE FROM r4_request_store WHERE user_id = %s", (self.id,)
        )

    def clear_all_requests_on_cooldown(self):
        return db.c.update(
            "DELETE FROM r4_request_store USING r4_song_sid WHERE r4_song_sid.song_id = r4_request_store.song_id AND r4_song_sid.sid = r4_request_store.sid AND user_id = %s AND song_cool_end > %s",
            (
                self.id,
                timestamp() + (20 * 60),
            ),
        )

    def pause_requests(self):
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

    def unpause_requests(self, sid):
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

    def put_in_request_line(self, sid):
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

    def remove_from_request_line(self):
        return (
            db.c.update("DELETE FROM r4_request_line WHERE user_id = %s", (self.id,))
            > 0
        )

    def is_in_request_line(self):
        return (
            db.c.fetch_var(
                "SELECT COUNT(*) FROM r4_request_line WHERE user_id = %s", (self.id,)
            )
            or 0
        ) > 0

    def get_top_request_song_id(self, sid):
        return db.c.fetch_var(
            "SELECT song_id FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE AND song_cool = FALSE AND song_elec_blocked = FALSE ORDER BY reqstor_order, reqstor_id LIMIT 1",
            (self.id, sid),
        )

    def get_top_request_song_id_any(self, sid):
        return db.c.fetch_var(
            "SELECT song_id FROM r4_request_store JOIN r4_song_sid USING (song_id) WHERE user_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE ORDER BY reqstor_order, reqstor_id LIMIT 1",
            (self.id, sid),
        )

    def get_request_line_sid(self):
        return db.c.fetch_var(
            "SELECT sid FROM r4_request_line WHERE user_id = %s", (self.id,)
        )

    def get_request_line_position(self, sid):
        if self.id <= 1:
            return None
        request_user_positions = cache.get_station(sid, "request_user_positions")
        if request_user_positions and self.id in request_user_positions:
            return request_user_positions[self.id]
        return None

    def get_request_expiry(self):
        if self.id <= 1:
            return None
        request_expire_times = cache.get("request_expire_times")
        if request_expire_times and self.id in request_expire_times:
            return request_expire_times[self.id]
        return None

    def get_requests(self, sid):
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

    def set_request_tunein_expiry(self, t=None):
        if not self.is_in_request_line():
            return None
        if not t:
            t = timestamp() + config.get("request_tunein_timeout")
        return db.c.update(
            "UPDATE r4_listeners SET line_expiry_tunein = %s WHERE user_id = %s",
            (t, self.id),
        )

    def lock_to_sid(self, sid, lock_count):
        self.data["lock"] = True
        self.data["lock_sid"] = sid
        self.data["lock_counter"] = lock_count
        return db.c.update(
            "UPDATE r4_listeners SET listener_lock = TRUE, listener_lock_sid = %s, listener_lock_counter = %s WHERE listener_id = %s",
            (sid, lock_count, self.data["listener_id"]),
        )

    def update(self, data):
        self.data.update(data)

    def generate_listen_key(self):
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

    def ensure_api_key(self):
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

    def generate_api_key(self, expiry=None, reuse=None):
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

    def save_preferences(self, ip_addr, prefs_json_string):
        if not config.get("store_prefs") or not prefs_json_string:
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
