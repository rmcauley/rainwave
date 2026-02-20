from typing import TypedDict

from psycopg import sql
from common.db.cursor import RainwaveCursor


class UnratedSongsRow(TypedDict):
    song_id: int
    unrated_count: int
    album_id: int


class UnratedAlbumsOnCooldownRow(TypedDict):
    album_id: int
    min_song_cool_end: int
    is_blocked: bool


with_request_albums_sql = sql.SQL(
    """
    WITH requested_albums AS (
        SELECT r4_songs.album_id 
        FROM r4_request_store 
            JOIN r4_song_sid ON (
                r4_request_store.song_id = r4_song_sid.song_id 
                AND r4_request_store.sid = r4_song_sid.sid
            ) 
            JOIN r4_songs ON (r4_songs.song_id = r4_request_store.song_id) 
        WHERE user_id = {user_id}
    )
    """
).format(user_id=sql.Placeholder(name="user_id"))


async def get_unrated_songs_for_requesting(
    cursor: RainwaveCursor, user_id: int, sid: int, limit: int
) -> list[int]:
    # This insane bit of SQL fetches the user's largest unrated albums that aren't on cooldown
    unrated: list[int] = []
    for row in await cursor.fetch_all(
        with_request_albums_sql
        + sql.SQL(
            """
            SELECT
                FIRST(r4_song_sid.song_id ORDER BY random()) AS song_id,
                COUNT(r4_song_sid.song_id) AS unrated_count,
                r4_songs.album_id
            FROM r4_song_sid
                JOIN r4_songs USING (song_id) 
                LEFT OUTER JOIN r4_song_ratings ON (
                    r4_song_sid.song_id = r4_song_ratings.song_id 
                    AND user_id = {user_id}
                ) 
                LEFT OUTER JOIN requested_albums ON (
                    requested_albums.album_id = r4_songs.album_id
                )
            WHERE r4_song_sid.sid = {sid}
                AND song_exists = TRUE
                AND song_cool = FALSE
                AND r4_song_ratings.song_rating_user IS NULL
                AND song_elec_blocked = FALSE
                AND requested_albums.album_id IS NULL
            GROUP BY r4_songs.album_id
            ORDER BY unrated_count DESC
            LIMIT {limit}
            """
        ).format(
            user_id=sql.Placeholder(name="user_id"),
            sid=sql.Placeholder(name="sid"),
            limit=sql.Placeholder(name="limit"),
        ),
        {"user_id": user_id, "sid": sid, "limit": limit},
        row_type=UnratedSongsRow,
    ):
        if row and row["song_id"]:
            unrated.append(row["song_id"])
    return unrated


async def get_unrated_songs_on_cooldown_for_requesting(
    cursor: RainwaveCursor, user_id: int, sid: int, limit: int
) -> list[int]:
    # Similar to the above, but this time we take whatever's on shortest cooldown (ignoring album unrated count)
    unrated: list[int] = []
    for album_row in await cursor.fetch_all(
        with_request_albums_sql
        + sql.SQL(
            """
            SELECT
                r4_songs.album_id,
                MIN(song_cool_end) AS min_song_cool_end,
                BOOL_OR(song_elec_blocked = TRUE) AS is_blocked
            FROM r4_song_sid
            JOIN r4_songs USING (song_id) LEFT OUTER
            JOIN r4_song_ratings
                ON (r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = {user_id}) LEFT OUTER
            JOIN requested_albums
                ON (requested_albums.album_id = r4_songs.album_id)
            WHERE r4_song_sid.sid = {sid}
                AND song_exists = TRUE
                AND (song_elec_blocked = TRUE OR song_cool = TRUE)
                AND r4_song_ratings.song_id IS NULL
                AND requested_albums.album_id IS NULL
            GROUP BY r4_songs.album_id
            ORDER BY is_blocked DESC,
                MIN(song_cool_end)
            LIMIT {limit}
            """
        ).format(
            user_id=sql.Placeholder(name="user_id"),
            sid=sql.Placeholder(name="sid"),
            limit=sql.Placeholder(name="limit"),
        ),
        {"user_id": user_id, "sid": sid, "limit": limit},
        row_type=UnratedAlbumsOnCooldownRow,
    ):
        song_id = await cursor.fetch_var(
            """
            SELECT
                r4_song_sid.song_id
            FROM r4_songs
            JOIN r4_song_sid USING (song_id) LEFT OUTER
            JOIN r4_song_ratings
                ON (r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s)
            WHERE r4_songs.album_id = %s
                AND r4_song_sid.sid = %s
                AND song_exists = TRUE
                AND (song_elec_blocked = TRUE OR song_cool = TRUE)
                AND r4_song_ratings.song_id IS NULL
            ORDER BY song_cool,
                song_cool_end
            LIMIT 1
            """,
            (user_id, album_row["album_id"], sid),
            var_type=int,
        )
        if song_id:
            unrated.append(song_id)
    return unrated
