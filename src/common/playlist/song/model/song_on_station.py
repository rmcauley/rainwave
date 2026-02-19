import os
from typing import TypedDict

from common import log
from common import config
from time import time as timestamp

from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.playlist.album.start_album_election_block import start_album_election_block
from common.playlist.extra_detail_histogram import (
    RatingHistogram,
    produce_rating_histogram,
)
from common.playlist.get_age_cooldown_multiplier import get_age_cooldown_multiplier
from common.playlist.cooldown_config import cooldown_config
from common.playlist.song.start_song_election_block import start_song_election_block
from common.playlist.song_group.load_groups_from_song_id import (
    load_groups_for_song_on_station,
)
from common.playlist.song_group.start_song_group_election_block import (
    start_song_group_election_block,
)
from common.ratings.rating_calculator import RatingMapReadyDict, rating_calculator
from common.playlist.object_counts import num_songs_total


class SongOnStationNotFoundError(Exception):
    pass


class SongOnStationRow(TypedDict):
    # from r4_songs
    song_id: int
    album_id: int
    song_origin_sid: int
    song_verified: bool
    song_scanned: bool
    song_filename: str
    song_title: str
    song_title_searchable: str
    song_artist_tag: str
    song_url: str | None
    song_link_text: str | None
    song_length: int
    song_track_number: int
    song_disc_number: int
    song_year: int
    song_added_on: int
    song_rating: float
    song_rating_count: int
    song_fave_count: int
    song_cool_multiply: int
    song_cool_override: int
    song_file_mtime: int
    song_replay_gain: str
    song_vote_count: int
    song_artist_parseable: str
    # from r4_albums
    album_name: str
    # from r4_song_sid
    sid: int
    song_cool: bool
    song_cool_end: int
    song_elec_appearances: int
    song_elec_last: int
    song_elec_blocked: bool
    song_elec_blocked_num: int
    song_elec_blocked_by: str
    song_played_last: int
    song_exists: bool
    song_request_only: bool
    song_request_only_end: int


class ArtistParseable(TypedDict):
    id: int
    name: str


class SongOnStationExtraDetail(TypedDict):
    song_rating_rank: int
    song_rating_rank_percentile: int
    song_rating_histogram: RatingHistogram


class SongOnStation:
    id: int
    sid: int
    filename: str
    data: SongOnStationRow

    def __init__(self, song_on_station_data: SongOnStationRow):
        self.id = song_on_station_data["song_id"]
        self.sid = song_on_station_data["sid"]
        self.filename = song_on_station_data["song_filename"]
        self.data = song_on_station_data

    @staticmethod
    async def load(
        cursor: RainwaveCursor | RainwaveCursorTx, song_id: int, sid: int
    ) -> SongOnStation:
        song_on_station_data = await cursor.fetch_row(
            """
            SELECT r4_songs.*, r4_albums.name AS album_name, r4_song_sid.*
            FROM r4_songs
                JOIN r4_albums USING (album_id)
                JOIN r4_song_sid ON (r4_songs.song_id = r4_song_sid.song_id AND r4_song_sid.sid = %s)
            WHERE r4_songs.song_id = %s
            """,
            (sid, song_id),
            row_type=SongOnStationRow,
        )
        if song_on_station_data is None:
            raise SongOnStationNotFoundError()
        return SongOnStation(song_on_station_data)

    async def start_cooldown(self, cursor: RainwaveCursor | RainwaveCursorTx) -> None:
        cool_time = cooldown_config[self.sid]["max_song_cool"]
        if self.data["song_cool_override"]:
            cool_time = self.data["song_cool_override"]
        else:
            cool_rating = self.data["song_rating"]
            # If no rating exists, give it a middle rating
            if not self.data["song_rating"] or self.data["song_rating"] == 0:
                cool_rating = cooldown_config[self.sid]["base_rating"]
            auto_cool = cooldown_config[self.sid]["min_song_cool"] + (
                ((4 - (cool_rating - 1)) / 4.0)
                * (
                    cooldown_config[self.sid]["max_song_cool"]
                    - cooldown_config[self.sid]["min_song_cool"]
                )
            )
            cool_time = (
                auto_cool
                * get_age_cooldown_multiplier(self.data["song_added_on"])
                * self.data["song_cool_multiply"]
            )

        log.debug(
            "cooldown",
            "Song ID %s Station ID %s cool_time period: %s"
            % (self.id, self.sid, cool_time),
        )
        cool_time = int(cool_time + timestamp())
        await cursor.update(
            """
            UPDATE r4_song_sid SET 
                song_cool = TRUE, 
                song_cool_end = %s 
            WHERE 
                song_id = %s 
                AND sid = %s 
                AND song_cool_end < %s
            """,
            (cool_time, self.id, self.sid, cool_time),
        )
        self.data["song_cool"] = True
        self.data["song_cool_end"] = cool_time

        self.data["song_request_only_end"] = (
            self.data["song_cool_end"]
            + config.stations[self.sid]["cooldown_request_only_period"]
        )

        self.data["song_request_only"] = True
        await cursor.update(
            """
            UPDATE r4_song_sid SET 
                song_request_only = TRUE, 
                song_request_only_end = %s 
            WHERE 
                song_id = %s 
                AND sid = %s
                AND song_request_only_end IS NOT NULL
            """,
            (self.data["song_request_only_end"], self.id, self.sid),
        )

    async def update_rating(self, cursor: RainwaveCursor | RainwaveCursorTx) -> None:
        ratings = await cursor.fetch_all(
            """
            SELECT 
                song_rating_user AS rating,
                COUNT(user_id) AS count
            FROM r4_song_ratings 
                JOIN phpbb_users USING (user_id) 
            WHERE 
                song_id = %s 
                AND radio_inactive = FALSE 
                AND song_rating_user IS NOT NULL 
            GROUP BY song_rating_user
            """,
            (self.id,),
            row_type=RatingMapReadyDict,
        )
        rating, rating_count = rating_calculator(ratings)

        log.debug("song_rating", "%s ratings for %s" % (rating_count, self.filename))
        if rating > 0 and rating_count > config.rating_threshold_for_calc:
            self.data["song_rating"] = rating
            self.data["song_rating_count"] = rating_count
            log.debug(
                "song_rating",
                "rating update: %s for %s" % (self.data["song_rating"], self.filename),
            )
            await cursor.update(
                "UPDATE r4_songs SET song_rating = %s, song_rating_count = %s WHERE song_id = %s",
                (self.data["song_rating"], rating_count, self.id),
            )

    async def load_extra_detail(
        self, cursor: RainwaveCursor
    ) -> SongOnStationExtraDetail:
        song_rating_rank = await cursor.fetch_guaranteed(
            "SELECT COUNT(song_id) + 1 FROM r4_songs WHERE song_verified = TRUE AND song_rating > %s",
            (self.data["song_rating"],),
            default=0,
            var_type=int,
        )
        song_rating_rank_percentile = (
            float(num_songs_total - song_rating_rank) / float(num_songs_total)
        ) * 100
        song_rating_rank_percentile = max(5, min(99, int(song_rating_rank_percentile)))

        histogram_rows = await cursor.fetch_all(
            """
                SELECT
                    ROUND(((song_rating_user * 10) - (CAST(song_rating_user * 10 AS SMALLINT) %% 5))) / 10 AS rating,
                    COUNT(song_rating_user) AS count
                FROM r4_song_ratings
                    JOIN phpbb_users USING (user_id)
                WHERE radio_inactive = FALSE
                    AND song_id = %s
                GROUP BY rating_user_rnd
                ORDER BY rating_user_rnd
            """,
            (self.id,),
            row_type=RatingMapReadyDict,
        )
        histogram = produce_rating_histogram(histogram_rows)

        return {
            "song_rating_rank": song_rating_rank,
            "song_rating_rank_percentile": song_rating_rank_percentile,
            "song_rating_histogram": histogram,
        }

    async def update_last_played(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> None:
        await cursor.update(
            "UPDATE r4_song_sid SET song_played_last = %s WHERE song_id = %s AND sid = %s",
            (timestamp(), self.id, self.sid),
        )

    async def update_fave_count(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> None:
        count = await cursor.fetch_guaranteed(
            "SELECT COUNT(*) FROM r4_song_ratings WHERE song_fave = TRUE AND song_id = %s",
            (self.id,),
            default=0,
            var_type=int,
        )
        await cursor.update(
            "UPDATE r4_songs SET song_fave_count = %s WHERE song_id = %s",
            (
                count,
                self.id,
            ),
        )

    def is_valid(self) -> bool:
        if self.filename and os.path.exists(self.filename):
            self.verified = True
            return True
        else:
            self.verified = False
            return False

    async def start_election_block(
        self, cursor: RainwaveCursor | RainwaveCursorTx
    ) -> None:
        await start_album_election_block(
            cursor,
            self.data["album_id"],
            self.sid,
            config.stations[self.sid]["num_planned_elections"] + 1,
        )
        await start_song_election_block(
            cursor,
            self.id,
            self.sid,
            config.stations[self.sid]["num_planned_elections"] + 1,
        )
        for group in await load_groups_for_song_on_station(cursor, self.id, self.sid):
            await start_song_group_election_block(
                cursor,
                group["group_id"],
                self.sid,
                config.stations[self.sid]["num_planned_elections"] + 1,
            )
