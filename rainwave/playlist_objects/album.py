import math
import os
from time import time as timestamp

from libs import cache, config, db, log
from rainwave import rating
from rainwave.playlist_objects import cooldown
from rainwave.playlist_objects.metadata import (AssociatedMetadata,
                                                MetadataNotFoundError,
                                                make_searchable_string)

num_albums = {}
updated_album_ids = {}
max_album_ids = {}


def clear_updated_albums(sid):
    global updated_album_ids
    updated_album_ids[sid] = {}


def get_updated_albums_dict(sid):
    global updated_album_ids
    if not sid in updated_album_ids:
        return []

    previous_newest_album = cache.get_station(sid, "newest_album")
    if not previous_newest_album:
        cache.set_station(sid, "newest_album", timestamp())
    else:
        newest_albums = db.c.fetch_list(
            "SELECT album_id FROM r4_albums JOIN r4_album_sid USING (album_id) WHERE sid = %s AND album_added_on > %s",
            (sid, previous_newest_album),
        )
        for album_id in newest_albums:
            updated_album_ids[sid][album_id] = True
        cache.set_station(sid, "newest_album", timestamp())
    album_diff = []
    for album_id in updated_album_ids[sid]:
        album = Album.load_from_id_sid(album_id, sid)
        album.solve_cool_lowest(sid)
        album_diff.append(album.to_album_diff())
    return album_diff


def warm_cooled_albums(sid):
    if sid == 0:
        return
    global updated_album_ids
    album_list = db.c.fetch_list(
        "SELECT album_id FROM r4_album_sid WHERE sid = %s AND album_cool_lowest <= %s AND album_cool = TRUE",
        (sid, timestamp()),
    )
    for album_id in album_list:
        updated_album_ids[sid][album_id] = True
    db.c.update(
        "UPDATE r4_album_sid SET album_cool = FALSE WHERE sid = %s AND album_cool_lowest <= %s AND album_cool = TRUE",
        (sid, timestamp()),
    )


class Album(AssociatedMetadata):
    sid = 0
    rating_precise = 0

    select_by_name_query = (
        "SELECT r4_albums.* FROM r4_albums WHERE lower(album_name) = lower(%s)"
    )
    select_by_id_query = "SELECT r4_albums.* FROM r4_albums WHERE album_id = %s"
    select_by_song_id_query = "SELECT r4_albums.* FROM r4_songs JOIN r4_albums USING (album_id) WHERE song_id = %s"
    has_song_id_query = (
        "SELECT COUNT(song_id) FROM r4_songs WHERE song_id = %s AND album_id = %s"
    )
    check_self_size_query = "SELECT COUNT(*) FROM r4_songs WHERE album_id = %s"
    delete_self_query = (
        "UPDATE r4_album_sid SET album_exists = FALSE WHERE album_id = %s"
    )

    @classmethod
    def load_from_id_sid(cls, album_id, sid):
        row = db.c.fetch_row(
            "SELECT r4_albums.*, album_rating, album_rating_count, album_cool, album_cool_lowest, album_cool_multiply, album_cool_override FROM r4_album_sid JOIN r4_albums USING (album_id) WHERE r4_album_sid.album_id = %s AND r4_album_sid.sid = %s",
            (album_id, sid),
        )
        if not row:
            raise MetadataNotFoundError(
                "%s ID %s for sid %s could not be found."
                % (cls.__name__, album_id, sid)
            )
        instance = cls()
        instance._assign_from_dict(row, sid)
        instance.sid = sid
        return instance

    @classmethod
    def load_from_id_with_songs(cls, album_id, sid, user=None, sort=None):
        row = db.c.fetch_row(
            "SELECT * FROM r4_albums JOIN r4_album_sid USING (album_id) WHERE album_id = %s AND sid = %s",
            (album_id, sid),
        )
        if not row:
            raise MetadataNotFoundError(
                "%s ID %s for sid %s could not be found."
                % (cls.__name__, album_id, sid)
            )
        instance = cls()
        instance._assign_from_dict(row, sid)
        instance.sid = sid
        user_id = None if not user else user.id
        requestable = bool(user)
        sql = (
            "SELECT r4_song_sid.song_id AS id, song_length AS length, song_origin_sid AS origin_sid, song_title AS title, song_added_on AS added_on, "
            "song_url AS url, song_link_text AS link_text, CAST(ROUND(CAST(song_rating AS NUMERIC), 1) AS REAL) AS rating, song_cool_multiply AS cool_multiply, "
            "song_cool_override AS cool_override, %s AS requestable, song_cool AS cool, song_cool_end AS cool_end, "
            "song_request_only_end AS request_only_end, song_request_only AS request_only, song_artist_parseable AS artist_parseable, "
            "COALESCE(song_rating_user, 0) AS rating_user, COALESCE(song_fave, FALSE) AS fave "
            "FROM r4_song_sid "
            "JOIN r4_songs USING (song_id) "
            "LEFT JOIN r4_song_ratings ON (r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) "
            "WHERE r4_song_sid.song_exists = TRUE AND r4_songs.song_verified = TRUE AND r4_songs.album_id = %s AND r4_song_sid.sid = %s "
        )
        if sort and sort == "added_on":
            sql += "ORDER BY song_added_on DESC, r4_songs.song_id DESC "
        else:
            sql += "ORDER BY song_title "
        instance.data["songs"] = db.c.fetch_all(
            sql, (requestable, user_id, instance.id, sid)
        )
        return instance

    @classmethod
    def get_art_url(cls, album_id, sid=None):
        if not config.get("album_art_file_path"):
            return ""
        elif sid and os.path.isfile(
            os.path.join(
                config.get("album_art_file_path"), "%s_%s_320.jpg" % (sid, album_id)
            )
        ):
            return "%s/%s_%s" % (config.get("album_art_url_path"), sid, album_id)
        elif os.path.isfile(
            os.path.join(config.get("album_art_file_path"), "a_%s_320.jpg" % album_id)
        ):
            return "%s/a_%s" % (config.get("album_art_url_path"), album_id)
        return ""

    def __init__(self):
        super(Album, self).__init__()
        self.is_tag = True

    def _insert_into_db(self):
        self.id = db.c.get_next_id("r4_albums", "album_id")
        success = db.c.update(
            "INSERT INTO r4_albums (album_id, album_name, album_name_searchable) VALUES (%s, %s, %s)",
            (self.id, self.data["name"], make_searchable_string(self.data["name"])),
        )
        return success

    def _update_db(self):
        global updated_album_ids

        success = db.c.update(
            "UPDATE r4_albums "
            "SET album_name = %s, album_name_searchable = %s "
            "WHERE album_id = %s",
            (self.data["name"], make_searchable_string(self.data["name"]), self.id),
        )
        if self.sid != 0:
            updated_album_ids[self.sid][self.id] = True
        return success

    def _assign_from_dict(self, d, sid=None):
        self.id = d["album_id"]
        self.data["name"] = d["album_name"]
        self.data["added_on"] = d["album_added_on"]
        if "album_rating" in d:
            self.rating_precise = d["album_rating"]
            self.data["rating"] = round(self.rating_precise, 1)
        self._dict_check_assign(d, "album_rating_count")
        self._dict_check_assign(d, "album_cool_multiply", 1)
        self._dict_check_assign(d, "album_cool_override")
        self._dict_check_assign(d, "album_cool_lowest", 0)
        self._dict_check_assign(d, "album_played_last", 0)
        self._dict_check_assign(d, "album_fave_count", 0)
        self._dict_check_assign(d, "album_vote_count", 0)
        self._dict_check_assign(d, "album_song_count", 0)
        self._dict_check_assign(d, "album_request_count", 0)
        self._dict_check_assign(d, "album_cool", False)
        if "sid" in d:
            self.sid = d["sid"]
        self.data["art"] = Album.get_art_url(self.id, sid)

    def _dict_check_assign(self, d, key, default=None, new_key=None):
        if not new_key and key.find("album_") == 0:
            new_key = key[6:]
        if key in d:
            self.data[new_key] = d[key]
        else:
            self.data[new_key] = default

    def get_num_songs(self, sid):
        return db.c.fetch_var(
            "SELECT COUNT(song_id) FROM r4_song_sid JOIN r4_songs USING (song_id) WHERE r4_songs.album_id = %s AND sid = %s AND song_exists = TRUE AND song_verified = TRUE",
            (self.id, sid),
        )

    def associate_song_id(self, song_id, is_tag=None):
        row = db.c.fetch_row(
            "SELECT album_id, song_added_on FROM r4_songs WHERE song_id = %s",
            (song_id,),
        )
        existing_album = row["album_id"]
        if not existing_album or existing_album != self.id:
            db.c.update(
                "UPDATE r4_songs SET album_id = %s WHERE song_id = %s",
                (self.id, song_id),
            )
        if existing_album and existing_album != self.id:
            old_album = Album.load_from_id(existing_album)
            old_album.reconcile_sids()
        self.reconcile_sids()
        for song_sid in db.c.fetch_list(
            "SELECT sid FROM r4_song_sid WHERE song_id = %s AND song_exists = TRUE",
            (song_id,),
        ):
            db.c.update(
                "UPDATE r4_album_sid SET album_newest_song_time = %s WHERE album_newest_song_time < %s AND album_id = %s AND sid = %s",
                (row["song_added_on"], row["song_added_on"], self.id, song_sid),
            )

    def disassociate_song_id(self, *args):
        # This function is never called on as part of the Album class
        # This code will never execute!!!
        pass

    def reconcile_sids(self):
        new_sids = db.c.fetch_list(
            "SELECT sid FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE r4_songs.album_id = %s AND song_exists = TRUE AND song_verified = TRUE GROUP BY sid",
            (self.id,),
        )
        current_sids = db.c.fetch_list(
            "SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = TRUE",
            (self.id,),
        )
        old_sids = db.c.fetch_list(
            "SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = FALSE",
            (self.id,),
        )
        for sid in current_sids:
            if not sid in new_sids:
                db.c.update(
                    "UPDATE r4_album_sid SET album_exists = FALSE AND album_song_count = 0 WHERE album_id = %s AND sid = %s",
                    (self.id, sid),
                )
        for sid in new_sids:
            if sid in current_sids:
                pass
            elif sid in old_sids:
                db.c.update(
                    "UPDATE r4_album_sid SET album_exists = TRUE WHERE album_id = %s AND sid = %s",
                    (self.id, sid),
                )
            else:
                db.c.update(
                    "INSERT INTO r4_album_sid (album_id, sid) VALUES (%s, %s)",
                    (self.id, sid),
                )
                if sid != 0:
                    updated_album_ids[sid][self.id] = True
            num_songs = self.get_num_songs(sid)
            db.c.update(
                "UPDATE r4_album_sid SET album_song_count = %s WHERE album_id = %s AND sid = %s",
                (num_songs, self.id, sid),
            )
        self.update_all_user_ratings()
        return new_sids

    def start_cooldown(self, sid, cool_time=False):
        if sid == 0:
            return

        if cool_time:
            pass
        elif self.data["cool_override"]:
            cool_time = self.data["cool_override"]
        else:
            cool_rating = self.rating_precise
            if not cool_rating or cool_rating == 0:
                cool_rating = 3
            # AlbumCD = minAlbumCD + ((maxAlbumR - albumR)/(maxAlbumR - minAlbumR)*(maxAlbumCD - minAlbumCD))
            # old: auto_cool = cooldown.cooldown_config[sid]['min_album_cool'] + (((4 - (cool_rating - 1)) / 4.0) * (cooldown.cooldown_config[sid]['max_album_cool'] - cooldown.cooldown_config[sid]['min_album_cool']))
            auto_cool = cooldown.cooldown_config[sid]["min_album_cool"] + (
                ((5 - cool_rating) / 4.0)
                * (
                    cooldown.cooldown_config[sid]["max_album_cool"]
                    - cooldown.cooldown_config[sid]["min_album_cool"]
                )
            )
            album_song_count = self.get_num_songs(sid)
            log.debug(
                "cooldown",
                "min_album_cool: %s .. max_album_cool: %s .. auto_cool: %s .. album_song_count: %s .. rating: %s"
                % (
                    cooldown.cooldown_config[sid]["min_album_cool"],
                    cooldown.cooldown_config[sid]["max_album_cool"],
                    auto_cool,
                    album_song_count,
                    cool_rating,
                ),
            )
            cool_size_multiplier = config.get_station(
                sid, "cooldown_size_min_multiplier"
            ) + (
                config.get_station(sid, "cooldown_size_max_multiplier")
                - config.get_station(sid, "cooldown_size_min_multiplier")
            ) / (
                1
                + math.pow(
                    2.7183,
                    (
                        config.get_station(sid, "cooldown_size_slope")
                        * (
                            album_song_count
                            - config.get_station(sid, "cooldown_size_slope_start")
                        )
                    ),
                )
                / 2
            )
            cool_age_multiplier = cooldown.get_age_cooldown_multiplier(
                self.data["added_on"]
            )
            cool_time = int(
                auto_cool
                * cool_size_multiplier
                * cool_age_multiplier
                * self.data["cool_multiply"]
            )
            log.debug(
                "cooldown",
                "auto_cool: %s .. cool_size_multiplier: %s .. cool_age_multiplier: %s .. cool_multiply: %s .. cool_time: %s"
                % (
                    auto_cool,
                    cool_size_multiplier,
                    cool_age_multiplier,
                    self.data["cool_multiply"],
                    cool_time,
                ),
            )
        updated_album_ids[sid][self.id] = True
        log.debug(
            "cooldown",
            "Album ID %s Station ID %s cool_time period: %s"
            % (self.id, sid, cool_time),
        )
        self._start_cooldown_db(sid, cool_time)

    def _start_cooldown_db(self, sid, cool_time):
        cool_end = int(cool_time + timestamp())
        db.c.update(
            "UPDATE r4_song_sid "
            "SET song_cool = TRUE, song_cool_end = %s "
            "FROM r4_songs "
            "WHERE r4_song_sid.song_id = r4_songs.song_id AND album_id = %s AND sid = %s AND song_cool_end <= %s ",
            (cool_end, self.id, sid, cool_end),
        )
        request_only_end = cool_end + config.get_station(
            sid, "cooldown_request_only_period"
        )
        db.c.update(
            "UPDATE r4_song_sid "
            "SET song_request_only = TRUE, song_request_only_end = %s "
            "FROM r4_songs "
            "WHERE r4_song_sid.song_id = r4_songs.song_id AND album_id = %s AND sid = %s AND song_cool_end <= %s "
            "AND song_request_only_end IS NOT NULL",
            (request_only_end, self.id, sid, cool_end),
        )

    def solve_cool_lowest(self, sid):
        self.data["cool_lowest"] = db.c.fetch_var(
            "SELECT MIN(song_cool_end) FROM r4_song_sid JOIN r4_songs USING (song_id) WHERE album_id = %s AND sid = %s AND song_exists = TRUE",
            (self.id, sid),
        )
        if self.data["cool_lowest"] > timestamp():
            self.data["cool"] = True
        else:
            self.data["cool"] = False
        db.c.update(
            "UPDATE r4_album_sid SET album_cool_lowest = %s, album_cool = %s WHERE album_id = %s AND sid = %s",
            (self.data["cool_lowest"], self.data["cool"], self.id, sid),
        )
        return self.data["cool_lowest"]

    def update_rating(self):
        for sid in db.c.fetch_list(
            "SELECT sid FROM r4_album_sid WHERE album_id = %s", (self.id,)
        ):
            ratings = db.c.fetch_all(
                "SELECT r4_song_ratings.song_rating_user AS rating, COUNT(r4_song_ratings.user_id) AS count "
                "FROM r4_songs "
                "JOIN r4_song_sid ON (r4_songs.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE) "
                "JOIN r4_song_ratings ON (r4_song_sid.song_id = r4_song_ratings.song_id AND r4_song_ratings.song_rating_user IS NOT NULL) "
                "JOIN phpbb_users ON (r4_song_ratings.user_id = phpbb_users.user_id AND phpbb_users.radio_inactive = FALSE) "
                "WHERE r4_songs.album_id = %s "
                "GROUP BY rating ",
                (sid, self.id),
            )
            (points, potential_points) = rating.rating_calculator(ratings)
            log.debug(
                "song_rating",
                "%s album ratings for %s (%s)"
                % (
                    potential_points,
                    self.data["name"],
                    config.station_id_friendly[sid],
                ),
            )
            if points > 0 and potential_points > config.get(
                "rating_threshold_for_calc"
            ):
                self.rating_precise = ((points / potential_points) * 4) + 1
                self.data["rating"] = round(self.rating_precise, 1)
                self.data["rating_count"] = potential_points
                log.debug(
                    "album_rating",
                    "%s new rating for %s" % (self.rating_precise, self.data["name"]),
                )
                db.c.update(
                    "UPDATE r4_album_sid SET album_rating = %s, album_rating_count = %s WHERE album_id = %s AND sid = %s",
                    (self.rating_precise, potential_points, self.id, sid),
                )

    def update_last_played(self, sid):
        return db.c.update(
            "UPDATE r4_album_sid SET album_played_last = %s WHERE album_id = %s AND sid = %s",
            (timestamp(), self.id, sid),
        )

    def get_all_ratings(self, sid):
        table = db.c.fetch_all(
            "SELECT "
            "phpbb_users.user_id AS user_id, "
            "album_rating_user, "
            "album_rating_complete, "
            "album_fave "
            "FROM "
            "phpbb_users "
            "LEFT JOIN r4_album_ratings ON (r4_album_ratings.user_id = phpbb_users.user_id AND r4_album_ratings.album_id = %s AND sid = %s) "
            "LEFT JOIN r4_album_faves ON (r4_album_faves.user_id = phpbb_users.user_id AND r4_album_faves.album_id = %s) "
            "WHERE phpbb_users.radio_inactive = FALSE",
            (self.id, sid, self.id),
        )
        all_ratings = {}
        for row in table:
            all_ratings[row["user_id"]] = {
                "rating_user": row["album_rating_user"] or 0,
                "fave": row["album_fave"] or False,
                "rating_complete": row["album_rating_complete"] or False,
            }

        return all_ratings

    def update_all_user_ratings(self):
        for sid in config.station_ids:
            num_songs = self.get_num_songs(sid)
            db.c.update(
                "WITH "
                "deleted AS ( "
                "DELETE FROM r4_album_ratings WHERE album_id = %s AND sid = %s RETURNING *"
                "), "
                "ratings AS ( "
                "SELECT album_id, sid, user_id, ROUND(CAST(AVG(song_rating_user) AS NUMERIC), 1) AS album_rating_user, COUNT(song_rating_user) AS song_rating_user_count "
                "FROM ("
                "SELECT song_id, sid, r4_songs.album_id FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE r4_songs.album_id = %s AND r4_song_sid.sid = %s AND song_exists = TRUE AND song_verified = TRUE "
                ") AS r4_song_sid LEFT JOIN r4_song_ratings USING (song_id) WHERE r4_song_ratings.song_rating_user IS NOT NULL "
                "GROUP BY album_id, sid, user_id "
                ") "
                "INSERT INTO r4_album_ratings (sid, album_id, user_id, album_rating_user, album_rating_complete) "
                "SELECT sid, album_id, user_id, NULLIF(MAX(album_rating_user), 0) AS album_rating_user, CASE WHEN MAX(song_rating_user_count) >= %s THEN TRUE ELSE FALSE END AS album_rating_complete "
                "FROM (SELECT * FROM ratings) AS result "
                "GROUP BY sid, album_id, user_id "
                "HAVING NULLIF(MAX(album_rating_user), 0) IS NOT NULL ",
                (self.id, sid, self.id, sid, num_songs),
            )

    def reset_user_completed_flags(self):
        db.c.update(
            "WITH status AS ( "
            "SELECT CASE WHEN COUNT(song_rating) >= album_song_count THEN TRUE ELSE FALSE END AS rating_complete, r4_songs.album_id, r4_song_sid.sid, user_id "
            "FROM r4_songs JOIN r4_song_sid USING (song_id) JOIN r4_song_ratings USING (song_id) JOIN r4_album_sid ON (r4_songs.album_id = r4_album_sid.album_id AND r4_song_sid.sid = r4_album_sid.sid) "
            "WHERE r4_songs.album_id = %s AND r4_song_sid.song_rating_user IS NOT NULL "
            "GROUP BY r4_songs.album_id, album_song_count, r4_song_sid.sid, user_id  "
            ") "
            "UPDATE r4_album_ratings "
            "SET album_rating_complete = status.rating_complete "
            "FROM status "
            "WHERE r4_album_ratings.album_id = status.album_id AND r4_album_ratings.sid = status.sid AND r4_album_ratings.user_id = status.user_id ",
            (self.id,),
        )

    def _start_election_block_db(self, sid, num_elections):
        # refer to song.set_election_block for base SQL
        db.c.update(
            "UPDATE r4_song_sid "
            "SET song_elec_blocked = TRUE, song_elec_blocked_by = %s, song_elec_blocked_num = %s "
            "FROM r4_songs "
            "WHERE r4_song_sid.song_id = r4_songs.song_id AND album_id = %s AND sid = %s AND song_elec_blocked_num <= %s",
            ("album", num_elections, self.id, sid, num_elections),
        )

    def load_extra_detail(self, sid, get_all_groups=False):
        global num_albums

        self.data["rating_rank"] = 1 + db.c.fetch_var(
            "SELECT COUNT(album_id) FROM r4_album_sid WHERE album_exists = TRUE AND album_rating > %s AND sid = %s",
            (self.rating_precise, sid),
        )
        self.data["request_rank"] = 1 + db.c.fetch_var(
            "SELECT COUNT(album_id) FROM r4_album_sid WHERE album_exists = TRUE AND album_request_count > %s AND sid = %s",
            (self.data["request_count"], sid),
        )
        self.data["rating_rank_percentile"] = (
            float(num_albums[sid] - self.data["rating_rank"]) / float(num_albums[sid])
        ) * 100
        self.data["rating_rank_percentile"] = max(
            5, min(99, int(self.data["rating_rank_percentile"]))
        )
        self.data["request_rank_percentile"] = (
            float(num_albums[sid] - self.data["rating_rank"]) / float(num_albums[sid])
        ) * 100
        self.data["request_rank_percentile"] = max(
            5, min(99, int(self.data["request_rank_percentile"]))
        )

        get_all_groups_sql = "AND r4_group_sid.group_display = TRUE"
        if get_all_groups:
            get_all_groups_sql = ""

        self.data["genres"] = db.c.fetch_all(
            "SELECT DISTINCT r4_groups.group_id AS id, group_name AS name "
            "FROM r4_songs "
            "JOIN r4_song_sid ON (r4_songs.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE) "
            "JOIN r4_song_group ON (r4_songs.song_id = r4_song_group.song_id) "
            "JOIN r4_group_sid ON (r4_song_group.group_id = r4_group_sid.group_id AND r4_group_sid.sid = %s "
            + get_all_groups_sql
            + ") "
            "JOIN r4_groups ON (r4_group_sid.group_id = r4_groups.group_id) "
            "WHERE song_verified = TRUE AND r4_songs.album_id = %s "
            "ORDER BY group_name ",
            (sid, sid, self.id),
        )

        self.data["rating_histogram"] = {}
        histo = db.c.fetch_all(
            "SELECT song_rating_user, COUNT(song_rating) AS rating_count "
            "FROM r4_song_ratings "
            "JOIN phpbb_users ON (r4_song_ratings.user_id = phpbb_users.user_id AND phpbb_users.radio_inactive = FALSE) "
            "JOIN r4_song_sid ON (r4_song_ratings.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s) "
            "JOIN r4_songs ON (r4_song_ratings.song_id = r4_songs.song_id) "
            "WHERE album_id = %s "
            "GROUP BY song_rating_user",
            (sid, self.id),
        )
        for point in histo:
            if point["song_rating_user"]:
                self.data["rating_histogram"][str(point["song_rating_user"])] = point[
                    "rating_count"
                ]

    def update_request_count(self, sid):
        count = db.c.fetch_var(
            "SELECT COUNT(*) FROM r4_songs JOIN r4_request_history USING (song_id) WHERE album_id = %s AND sid = %s",
            (self.id, sid),
        )
        return db.c.update(
            "UPDATE r4_album_sid SET album_request_count = %s WHERE album_id = %s AND sid = %s",
            (count, self.id, sid),
        )

    def update_fave_count(self):
        count = db.c.fetch_var(
            "SELECT COUNT(*) FROM r4_album_faves WHERE album_fave = TRUE AND album_id = %s",
            (self.id,),
        )
        return db.c.update(
            "UPDATE r4_album_sid SET album_fave_count = %s WHERE album_id = %s",
            (count, self.id),
        )

    def update_vote_count(self, sid):
        count = db.c.fetch_var(
            "SELECT COUNT(song_id) FROM r4_vote_history JOIN r4_songs USING (song_id) WHERE album_id = %s AND sid = %s",
            (self.id, sid),
        )
        return db.c.update(
            "UPDATE r4_album_sid SET album_vote_count = %s WHERE album_id = %s AND sid = %s",
            (count, self.id, sid),
        )

    def to_dict(self, user=None):
        d = {}
        d["id"] = self.id
        for v in ["rating", "art", "name"]:
            d[v] = self.data[v]

        if user:
            d.update(rating.get_album_rating(self.sid, self.id, user.id))
        else:
            d["rating_user"] = None
            d["fave"] = None
        return d

    def to_dict_full(self, user=None):
        d = super(Album, self).to_dict_full(user)
        if user:
            d.update(rating.get_album_rating(self.sid, self.id, user.id))
        else:
            d["rating_user"] = None
            d["fave"] = None
        return d

    def to_album_diff(self):
        return {
            "id": self.id,
            "cool": self.data["cool"],
            "cool_lowest": self.data["cool_lowest"],
            "newest_song_time": self.data["newest_song_time"],
        }
