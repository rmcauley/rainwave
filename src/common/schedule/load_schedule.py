async def load_schedule(sid: int) -> None:
    current = cache.get_station(sid, "sched_current")
    # If our cache is empty, pull from the DB
    if not current:
        current = get_event_in_progress(sid)
    if not current:
        raise Exception("Could not load any events!")

    upnext = cache.get_station(sid, "sched_next")
    if not upnext:
        upnext = []
        manage_next(sid)

    history = cache.get_station(sid, "sched_history")
    if not history:
        history = []
        for song_id in await cursor.fetch_list(
            "SELECT song_id FROM r4_song_history JOIN r4_song_sid USING (song_id, sid) JOIN r4_songs USING (song_id) WHERE sid = %s AND song_exists = TRUE AND song_verified = TRUE ORDER BY songhist_time DESC LIMIT 5",
            (sid,),
        ):
            history.insert(0, SingleSong(song_id, sid))
        # create a fake history in case clients expect it without checking
        if not history:
            for i in range(1, 5):
                history.insert(
                    0,
                    SingleSong(playlist.get_random_song_ignore_all(sid), sid),
                )
