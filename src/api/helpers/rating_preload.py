from dataclasses import dataclass
from typing import TypedDict

from api import rainwave_typeddicts
from common.db.cursor import RainwaveCursor


SongRatings = dict[int, tuple[float | None, bool | None]]
AlbumRatings = dict[int, tuple[float | None, bool | None]]


class SongRatingPreloadRow(TypedDict):
    user_id: int
    song_id: int
    song_rating_user: float | None
    song_fave: bool | None


class AlbumRatingPreloadRow(TypedDict):
    user_id: int
    album_id: int
    album_rating_user: float | None


class AlbumFavePreloadRow(TypedDict):
    user_id: int
    album_id: int
    album_fave: bool | None


@dataclass(frozen=True)
class RatingPreload:
    user_ids: set[int]
    song_ratings_by_user: dict[int, SongRatings]
    album_ratings_by_user: dict[int, AlbumRatings]


def collect_timeline_song_album_ids(
    sched_current: rainwave_typeddicts.TimelineEntry,
    sched_next: list[rainwave_typeddicts.TimelineEntry],
    sched_history: list[rainwave_typeddicts.TimelineEntry],
) -> tuple[list[int], list[int]]:
    song_ids: set[int] = set()
    album_ids: set[int] = set()

    for upnext in sched_next:
        for song in upnext["songs"]:
            song_ids.add(song["id"])
            album_ids.add(song["albums"][0]["id"])
    for song in sched_current["songs"]:
        song_ids.add(song["id"])
        album_ids.add(song["albums"][0]["id"])
    for history_entry in sched_history:
        for song in history_entry["songs"]:
            song_ids.add(song["id"])
            album_ids.add(song["albums"][0]["id"])

    return list(song_ids), list(album_ids)


async def get_rating_preload(
    cursor: RainwaveCursor,
    sid: int,
    user_ids: set[int],
    song_ids: list[int],
    album_ids: list[int],
) -> RatingPreload:
    song_ratings_by_user: dict[int, SongRatings] = {}
    album_ratings_by_user: dict[int, AlbumRatings] = {}

    if not user_ids:
        return RatingPreload(
            user_ids=user_ids,
            song_ratings_by_user=song_ratings_by_user,
            album_ratings_by_user=album_ratings_by_user,
        )

    user_id_list = list(user_ids)

    if song_ids:
        song_rating_rows = await cursor.fetch_all(
            """
            SELECT
                user_id,
                song_id,
                song_rating_user,
                song_fave
            FROM r4_song_ratings
            WHERE
                user_id = ANY (%s)
                AND song_id = ANY (%s)
            """,
            (user_id_list, song_ids),
            row_type=SongRatingPreloadRow,
        )
        for song_rating_row in song_rating_rows:
            song_ratings_by_user.setdefault(song_rating_row["user_id"], {})[
                song_rating_row["song_id"]
            ] = (
                song_rating_row["song_rating_user"],
                song_rating_row["song_fave"],
            )

    if album_ids:
        album_rating_rows = await cursor.fetch_all(
            """
            SELECT
                user_id,
                album_id,
                album_rating_user
            FROM r4_album_ratings
            WHERE
                user_id = ANY (%s)
                AND sid = %s
                AND album_id = ANY (%s)
            """,
            (user_id_list, sid, album_ids),
            row_type=AlbumRatingPreloadRow,
        )
        for album_rating_row in album_rating_rows:
            album_ratings_by_user.setdefault(album_rating_row["user_id"], {})[
                album_rating_row["album_id"]
            ] = (
                album_rating_row["album_rating_user"],
                None,
            )

        album_fave_rows = await cursor.fetch_all(
            """
            SELECT
                user_id,
                album_id,
                album_fave
            FROM r4_album_faves
            WHERE
                user_id = ANY (%s)
                AND album_id = ANY (%s)
            """,
            (user_id_list, album_ids),
            row_type=AlbumFavePreloadRow,
        )
        for album_fave_row in album_fave_rows:
            user_album_ratings = album_ratings_by_user.setdefault(
                album_fave_row["user_id"], {}
            )
            album_rating_user, _ = user_album_ratings.get(
                album_fave_row["album_id"], (None, None)
            )
            user_album_ratings[album_fave_row["album_id"]] = (
                album_rating_user,
                album_fave_row["album_fave"],
            )

    return RatingPreload(
        user_ids=user_ids,
        song_ratings_by_user=song_ratings_by_user,
        album_ratings_by_user=album_ratings_by_user,
    )
