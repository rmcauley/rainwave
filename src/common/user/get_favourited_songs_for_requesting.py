from typing import TypedDict

from psycopg import sql
from common.db.cursor import RainwaveCursor
from common.user.get_unrated_songs_for_requesting import with_request_albums_sql


class FavoriteSongsRow(TypedDict):
    song_id: int
    album_id: int
    song_fave: bool


async def get_favorited_songs_for_requesting(
    cursor: RainwaveCursor, user_id: int, sid: int, limit: int
) -> list[int]:
    # This SQL fetches ALL favourites, then shuffles between just the favourites, to get 1 fav per album.
    # It then does the same for any song rated >= 4.5 by the user.
    # Favourites are bubbled to the top of the heap.  The rest is randomly sorted. (but always above 4.5!)
    favorited: list[int] = []
    for row in await cursor.fetch_all(
        with_request_albums_sql
        + sql.SQL(
            """
            SELECT
                FIRST(r4_song_ratings.song_id ORDER BY song_fave DESC NULLS LAST, random()) AS song_id,
                r4_songs.album_id,
                BOOL_OR(COALESCE(r4_song_ratings.song_fave, FALSE)) AS song_fave
            FROM r4_song_sid
                JOIN r4_songs USING (song_id)
                JOIN r4_song_ratings ON (
                    r4_song_sid.song_id = r4_song_ratings.song_id 
                    AND user_id = {user_id}
                    AND (
                        r4_song_ratings.song_fave = TRUE 
                        OR r4_song_ratings.song_rating_user >= 4.5
                    )
                )
                LEFT OUTER JOIN requested_albums ON (
                    requested_albums.album_id = r4_songs.album_id
                )
            WHERE r4_song_sid.sid = {sid}
                AND song_exists = TRUE
                AND song_cool = FALSE
                AND song_elec_blocked = FALSE
                AND requested_albums.album_id IS NULL
            GROUP BY r4_songs.album_id
            ORDER BY song_fave DESC NULLS LAST, random()
            LIMIT {limit}
            """
        ).format(
            user_id=sql.Placeholder(name="user_id"),
            sid=sql.Placeholder(name="sid"),
            limit=sql.Placeholder(name="limit"),
        ),
        {"user_id": user_id, "sid": sid, "limit": limit},
        row_type=FavoriteSongsRow,
    ):
        favorited.append(row["song_id"])

    return favorited
