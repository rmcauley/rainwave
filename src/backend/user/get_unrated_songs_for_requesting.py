def _get_requested_albums_sql() -> str:
    return (
        "WITH requested_albums AS ("
        "SELECT r4_songs.album_id "
        "FROM r4_request_store "
        "JOIN r4_song_sid ON "
        "(r4_request_store.song_id = r4_song_sid.song_id "
        "AND r4_request_store.sid = r4_song_sid.sid) "
        "JOIN r4_songs ON (r4_songs.song_id = r4_request_store.song_id) "
        "WHERE user_id = %s) "
    )


def get_unrated_songs_for_requesting(user_id: int, sid: int, limit: int) -> list[int]:
    # This insane bit of SQL fetches the user's largest unrated albums that aren't on cooldown
    unrated = []
    for row in await cursor.fetch_all(
        _get_requested_albums_sql()
        + (
            """
            SELECT
                FIRST(r4_song_sid.song_id ORDER BY random()) AS song_id,
                COUNT(r4_song_sid.song_id) AS unrated_count,
                r4_songs.album_id
            FROM r4_song_sid
                JOIN r4_songs USING (song_id) 
                LEFT OUTER JOIN r4_song_ratings ON (
                    r4_song_sid.song_id = r4_song_ratings.song_id 
                    AND user_id = %s
                ) 
                LEFT OUTER JOIN requested_albums ON (
                    requested_albums.album_id = r4_songs.album_id
                )
            WHERE r4_song_sid.sid = %s
                AND song_exists = TRUE
                AND song_cool = FALSE
                AND r4_song_ratings.song_rating_user IS NULL
                AND song_elec_blocked = FALSE
                AND requested_albums.album_id IS NULL
            GROUP BY r4_songs.album_id
            ORDER BY unrated_count DESC
            LIMIT %s
"""
        ),
        (user_id, user_id, sid, limit),
    ):
        if row and row["song_id"]:
            unrated.append(row["song_id"])
    return unrated


def get_unrated_songs_on_cooldown_for_requesting(
    user_id: int, sid: int, limit: int
) -> list[int]:
    # Similar to the above, but this time we take whatever's on shortest cooldown (ignoring album unrated count)
    unrated = []
    for album_row in await cursor.fetch_all(
        _get_requested_albums_sql()
        + (
            """
SELECT
    r4_songs.album_id,
    MIN(song_cool_end),
    BOOL_OR(song_elec_blocked = TRUE) AS is_blocked
FROM r4_song_sid
JOIN r4_songs USING (song_id) LEFT OUTER
JOIN r4_song_ratings
    ON (r4_song_sid.song_id = r4_song_ratings.song_id AND user_id = %s) LEFT OUTER
JOIN requested_albums
    ON (requested_albums.album_id = r4_songs.album_id)
WHERE r4_song_sid.sid = %s
    AND song_exists = TRUE
    AND (song_elec_blocked = TRUE OR song_cool = TRUE)
    AND r4_song_ratings.song_id IS NULL
    AND requested_albums.album_id IS NULL
GROUP BY r4_songs.album_id
ORDER BY is_blocked DESC,
    MIN(song_cool_end)
LIMIT %s
"""
        ),
        (user_id, user_id, sid, limit),
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
        )
        if song_id:
            unrated.append(song_id)
    return unrated
