def get_unrated_songs_for_user(
    user_id: int, limit: str = "LIMIT ALL"
) -> list[dict[str, Any]]:
    return db.c.fetch_all(
        """
        SELECT
            r4_songs.song_id AS id,
            song_title AS title,
            album_name
        FROM r4_songs
        JOIN r4_albums USING (album_id) 
        LEFT OUTER JOIN r4_song_ratings ON (
            r4_songs.song_id = r4_song_ratings.song_id
            AND user_id = %s
        )
        WHERE song_verified = TRUE
            AND song_rating_user IS NULL
            AND song_origin_sid > 0
        ORDER BY album_name, song_title
"""
        + limit,
        (user_id,),
    )
