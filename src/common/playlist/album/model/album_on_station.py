from datetime import datetime
from time import time as timestamp
import math
from typing import TypedDict

from common import config
from common import log
from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.extra_detail_histogram import (
    RatingHistogram,
    produce_rating_histogram,
)
from common.ratings.rating_calculator import RatingMapReadyDict, rating_calculator
from .album import AlbumRow
from common.playlist.cooldown_config import cooldown_config
from common.playlist.get_age_cooldown_multiplier import get_age_cooldown_multiplier
from common.playlist.object_counts import num_albums


class AlbumOnStationRow(AlbumRow):
    album_exists: bool
    sid: int
    album_song_count: int
    album_played_last: int
    album_requests_pending: bool
    album_cool: bool
    album_cool_multiply: float
    album_cool_override: int
    album_cool_lowest: int
    album_elec_last: int
    album_rating: float
    album_rating_count: int
    album_request_count: int
    album_fave_count: int
    album_newest_song_time: int | None
    album_art_url: str | None
    album_updated_at: datetime


class AlbumOnStationExtraDetailsGenreRow(TypedDict):
    id: int
    name: str


class AlbumOnStationExtraDetail(TypedDict):
    album_rating_rank: int
    album_rating_rank_percentile: int
    album_request_rank: int
    album_request_rank_percentile: int
    album_genres: list[AlbumOnStationExtraDetailsGenreRow]
    album_rating_histogram: RatingHistogram


class AlbumDiff(TypedDict):
    id: int
    cool: bool
    cool_lowest: int
    newest_song_time: int
    rating: float
    name: str


class AlbumOnStation:
    album_id: int
    sid: int
    data: AlbumOnStationRow

    def __init__(self, album_on_station_data: AlbumOnStationRow):
        self.album_id = album_on_station_data["album_id"]
        self.sid = album_on_station_data["sid"]
        self.data = album_on_station_data

    def get_cooldown_time(self) -> int:
        if self.data["album_cool_override"]:
            return self.data["album_cool_override"]

        cool_rating = self.data["album_rating"]
        if not cool_rating or cool_rating == 0:
            cool_rating = 3
        # AlbumCD = minAlbumCD + ((maxAlbumR - albumR)/(maxAlbumR - minAlbumR)*(maxAlbumCD - minAlbumCD))
        auto_cool = cooldown_config[self.sid]["min_album_cool"] + (
            ((5 - cool_rating) / 4.0)
            * (
                cooldown_config[self.sid]["max_album_cool"]
                - cooldown_config[self.sid]["min_album_cool"]
            )
        )
        album_song_count = self.data["album_song_count"]
        log.debug(
            "cooldown",
            "min_album_cool: %s .. max_album_cool: %s .. auto_cool: %s .. album_song_count: %s .. rating: %s"
            % (
                cooldown_config[self.sid]["min_album_cool"],
                cooldown_config[self.sid]["max_album_cool"],
                auto_cool,
                album_song_count,
                cool_rating,
            ),
        )
        cool_size_multiplier = config.stations[self.sid][
            "cooldown_size_min_multiplier"
        ] + (
            config.stations[self.sid]["cooldown_size_max_multiplier"]
            - config.stations[self.sid]["cooldown_size_min_multiplier"]
        ) / (
            1
            + math.pow(
                2.7183,
                (
                    config.stations[self.sid]["cooldown_size_slope"]
                    * (
                        album_song_count
                        - config.stations[self.sid]["cooldown_size_slope_start"]
                    )
                ),
            )
            / 2
        )
        cool_age_multiplier = get_age_cooldown_multiplier(self.data["album_added_on"])
        cool_time = int(
            auto_cool
            * cool_size_multiplier
            * cool_age_multiplier
            * self.data["album_cool_multiply"]
        )
        log.debug(
            "cooldown",
            "auto_cool: %s .. cool_size_multiplier: %s .. cool_age_multiplier: %s .. cool_multiply: %s .. cool_time: %s"
            % (
                auto_cool,
                cool_size_multiplier,
                cool_age_multiplier,
                self.data["album_cool_multiply"],
                cool_time,
            ),
        )
        return cool_time

    async def start_cooldown(
        self,
        cursor: RainwaveCursor | RainwaveCursorTx,
        cool_time_override: int | None = None,
    ) -> None:
        cool_time = cool_time_override or self.get_cooldown_time()
        cool_end = cool_time + int(timestamp())
        request_only_end = (
            cool_end + config.stations[self.sid]["cooldown_request_only_period"]
        )
        log.debug(
            "cooldown",
            "Album ID %s Station ID %s cool_time period: %s"
            % (self.album_id, self.sid, cool_time),
        )
        await cursor.update(
            """
            UPDATE r4_song_sid
            SET song_cool = TRUE,
                song_cool_end = %s
            FROM r4_songs
            WHERE r4_song_sid.song_id = r4_songs.song_id
                AND album_id = %s
                AND sid = %s
                AND song_cool_end <= %s
            """,
            (cool_end, self.album_id, self.sid, cool_end),
        )
        await cursor.update(
            """
            UPDATE r4_song_sid
            SET song_request_only = TRUE,
                song_request_only_end = %s
            FROM r4_songs
            WHERE r4_song_sid.song_id = r4_songs.song_id
                AND album_id = %s
                AND sid = %s
                AND song_cool_end <= %s
                AND song_request_only_end IS NOT NULL
            """,
            (request_only_end, self.album_id, self.sid, cool_end),
        )

    async def update_lowest_cooldown(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> None:
        self.data["album_cool_lowest"] = await cursor.fetch_guaranteed(
            "SELECT MIN(song_cool_end) FROM r4_song_sid JOIN r4_songs USING (song_id) WHERE album_id = %s AND sid = %s AND song_exists = TRUE",
            (self.album_id, self.sid),
            default=0,
            var_type=int,
        )
        if self.data["album_cool_lowest"] > timestamp():
            self.data["album_cool"] = True
        else:
            self.data["album_cool"] = False

        await cursor.update(
            "UPDATE r4_album_sid SET album_cool_lowest = %s, album_cool = %s WHERE album_id = %s AND sid = %s",
            (
                self.data["album_cool_lowest"],
                self.data["album_cool"],
                self.album_id,
                self.sid,
            ),
        )

    async def update_last_played(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> None:
        await cursor.update(
            "UPDATE r4_album_sid SET album_played_last = %s WHERE album_id = %s AND sid = %s",
            (timestamp(), self.album_id, self.sid),
        )

    async def load_extra_detail(
        self, cursor: RainwaveCursor
    ) -> AlbumOnStationExtraDetail:
        album_rating_rank = await cursor.fetch_guaranteed(
            "SELECT COUNT(album_id) + 1 FROM r4_album_sid WHERE album_exists = TRUE AND album_rating > %s AND sid = %s",
            (self.data["album_rating"], self.sid),
            default=num_albums[self.sid],
            var_type=int,
        )
        album_rating_rank_percentile = max(
            5,
            min(
                99,
                int(
                    float(num_albums[self.sid] - album_rating_rank)
                    / float(num_albums[self.sid])
                )
                * 100,
            ),
        )

        album_genres = await cursor.fetch_all(
            """
            SELECT DISTINCT r4_groups.group_id AS id, group_name AS name 
            FROM r4_songs 
            JOIN r4_song_sid ON (r4_songs.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE) 
            JOIN r4_song_group ON (r4_songs.song_id = r4_song_group.song_id) 
            JOIN r4_group_sid ON (r4_song_group.group_id = r4_group_sid.group_id AND r4_group_sid.sid = %s AND r4_group_sid.group_display = TRUE) 
            JOIN r4_groups ON (r4_group_sid.group_id = r4_groups.group_id) 
            WHERE song_verified = TRUE AND r4_songs.album_id = %s 
            ORDER BY group_name
""",
            (self.sid, self.sid, self.album_id),
            row_type=AlbumOnStationExtraDetailsGenreRow,
        )

        histogram_rows = await cursor.fetch_all(
            """
                SELECT
                    song_rating_user AS rating,
                    COUNT(song_rating) AS count
                FROM r4_song_ratings
                JOIN phpbb_users ON (
                    r4_song_ratings.user_id = phpbb_users.user_id 
                    AND phpbb_users.radio_inactive = FALSE
                )
                JOIN r4_song_sid ON (
                    r4_song_ratings.song_id = r4_song_sid.song_id 
                    AND r4_song_sid.sid = %s
                )
                JOIN r4_songs ON (
                    r4_song_ratings.song_id = r4_songs.song_id 
                    AND r4_songs.song_verified = TRUE
                )
                WHERE album_id = %s
                GROUP BY song_rating_user
""",
            (self.sid, self.album_id),
            row_type=RatingMapReadyDict,
        )
        histogram = produce_rating_histogram(histogram_rows)

        return {
            "album_genres": album_genres,
            "album_rating_histogram": histogram,
            "album_rating_rank": album_rating_rank,
            "album_rating_rank_percentile": album_rating_rank_percentile,
            "album_request_rank": 0,
            "album_request_rank_percentile": 0,
        }

    async def update_rating(self, cursor: RainwaveCursor | RainwaveCursorTx) -> None:
        for sid in await cursor.fetch_list(
            "SELECT sid FROM r4_album_sid WHERE album_id = %s AND album_exists = TRUE",
            (self.album_id,),
            row_type=int,
        ):
            ratings = await cursor.fetch_all(
                """
                SELECT r4_song_ratings.song_rating_user AS rating, COUNT(r4_song_ratings.user_id) AS count 
                FROM r4_songs 
                JOIN r4_song_sid ON (r4_songs.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s AND r4_song_sid.song_exists = TRUE) 
                JOIN r4_song_ratings ON (r4_song_sid.song_id = r4_song_ratings.song_id AND r4_song_ratings.song_rating_user IS NOT NULL) 
                JOIN phpbb_users ON (r4_song_ratings.user_id = phpbb_users.user_id AND phpbb_users.radio_inactive = FALSE) 
                WHERE r4_songs.album_id = %s 
                GROUP BY rating
""",
                (sid, self.album_id),
                row_type=RatingMapReadyDict,
            )
            (rating, rating_count) = rating_calculator(ratings)
            log.debug(
                "song_rating",
                "%s album ratings for %s (%s)"
                % (
                    rating_count,
                    self.data["album_name"],
                    config.station_id_friendly[sid],
                ),
            )

            if rating > 0 and rating_count > config.rating_threshold_for_calc:
                await cursor.update(
                    "UPDATE r4_album_sid SET album_rating = %s, album_rating_count = %s WHERE album_id = %s AND sid = %s",
                    (rating, rating_count, self.album_id, sid),
                )
                if sid == self.sid:
                    self.data["album_rating"] = rating
                    self.data["album_rating_count"] = rating_count
                log.debug(
                    "album_rating",
                    "%s new rating for %s on station %s"
                    % (rating, self.data["album_name"], sid),
                )

    def to_album_diff(self) -> AlbumDiff:
        return {
            "id": self.album_id,
            "cool": self.data["album_cool"],
            "cool_lowest": self.data["album_cool_lowest"],
            "newest_song_time": self.data.get("album_newest_song_time", 0) or 0,
            "rating": self.data["album_rating"],
            "name": self.data["album_name"],
        }

    @staticmethod
    async def update_newest_song_time(
        cursor: RainwaveCursor | RainwaveCursorTx, album_id: int, sid: int
    ) -> None:
        newest_song = cursor.fetch_guaranteed(
            """
            SELECT MIN(song_added_on) 
            FROM r4_songs 
                JOIN r4_song_sid USING (song_id) 
            WHERE album_id = %s AND sid = %s
        """,
            (album_id, sid),
            default=0,
            var_type=int,
        )
        await cursor.update(
            """
            UPDATE r4_album_sid 
            SET album_newest_song_time = %s 
            WHERE album_id = %s AND sid = %s
            """,
            (newest_song, album_id, sid),
        )
