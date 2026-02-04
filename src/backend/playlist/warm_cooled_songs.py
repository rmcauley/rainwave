def warm_cooled_songs(sid: int) -> None:
    """
    Makes songs whose cooldowns have expired available again.
    """
    db.c.update(
        "UPDATE r4_song_sid SET song_cool = FALSE WHERE sid = %s AND song_cool_end < %s AND song_cool = TRUE",
        (sid, int(timestamp())),
    )
    db.c.update(
        "UPDATE r4_song_sid SET song_request_only = FALSE WHERE sid = %s AND song_request_only_end IS NOT NULL AND song_request_only_end < %s AND song_request_only = TRUE",
        (sid, int(timestamp())),
    )
