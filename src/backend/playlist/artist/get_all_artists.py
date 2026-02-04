def get_all_artists_list(sid: int) -> list[dict[str, Any]]:
    return db.c.fetch_all(
        "SELECT artist_name AS name, artist_id AS id, COUNT(*) AS song_count "
        "FROM r4_artists JOIN r4_song_artist USING (artist_id) JOIN r4_song_sid using (song_id) "
        "WHERE r4_song_sid.sid = %s AND song_exists = TRUE "
        "GROUP BY artist_id, artist_name "
        "ORDER BY artist_name",
        (sid,),
    )
