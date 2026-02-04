def get_random_song_timed(
    sid: int, target_seconds: int | None = None, target_delta: int | None = None
) -> Song:
    """
    Fetch a random song abiding by all election block, request block, and
    availability rules, but giving priority to the target song length
    provided.  Falls back to get_random_song on failure.
    """
    if not target_seconds:
        return get_random_song(sid)
    if not target_delta:
        target_delta = config.get_station(sid, "song_lookup_length_delta")

    sql_query = (
        "FROM r4_song_sid "
        "JOIN r4_songs USING (song_id) "
        "JOIN r4_album_sid ON (r4_album_sid.album_id = r4_songs.album_id AND r4_album_sid.sid = r4_song_sid.sid) "
        "WHERE r4_song_sid.sid = %s "
        "AND song_exists = TRUE "
        "AND song_cool = FALSE "
        "AND song_elec_blocked = FALSE "
        "AND album_requests_pending IS NULL "
        "AND song_request_only = FALSE "
        "AND song_length >= %s AND song_length <= %s"
    )
    lower_target_bound = target_seconds - (target_delta / 2)
    upper_target_bound = target_seconds + (target_delta / 2)
    num_available = db.c.fetch_var(
        "SELECT COUNT(r4_song_sid.song_id) " + sql_query,
        (sid, lower_target_bound, upper_target_bound),
    )
    log.info(
        "song_select",
        "Song pool size (cooldown, blocks, requests, timed) [target %s delta %s]: %s"
        % (target_seconds, target_delta, num_available),
    )
    if not num_available or num_available == 0:
        log.warn(
            "song_select",
            "No songs available with target_seconds %s and target_delta %s."
            % (target_seconds, target_delta),
        )
        log.debug(
            "song_select",
            "Song select query: SELECT COUNT(r4_song_sid.song_id) "
            + sql_query % (sid, lower_target_bound, upper_target_bound),
        )
        return get_random_song(sid)
    else:
        offset = random.randint(1, num_available) - 1
        song_id = db.c.fetch_var(
            "SELECT r4_song_sid.song_id " + sql_query + " LIMIT 1 OFFSET %s",
            (sid, lower_target_bound, upper_target_bound, offset),
        )
        return Song.load_from_id(song_id, sid)


def get_random_song(sid: int) -> Song:
    """
    Fetch a random song, abiding by all election block, request block, and
    availability rules.  Falls back to get_random_ignore_requests on failure.
    """

    sql_query = (
        "FROM r4_song_sid "
        "JOIN r4_songs USING (song_id) "
        "JOIN r4_album_sid ON (r4_album_sid.album_id = r4_songs.album_id AND r4_album_sid.sid = r4_song_sid.sid) "
        "WHERE r4_song_sid.sid = %s "
        "AND song_exists = TRUE "
        "AND song_cool = FALSE "
        "AND song_request_only = FALSE "
        "AND song_elec_blocked = FALSE "
        "AND album_requests_pending IS NULL"
    )
    num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
    log.info(
        "song_select", "Song pool size (cooldown, blocks, requests): %s" % num_available
    )
    offset = 0
    if not num_available or num_available == 0:
        log.warn("song_select", "No songs available despite no timing rules.")
        log.debug(
            "song_select",
            "Song select query: SELECT COUNT(song_id) " + (sql_query % (sid,)),
        )
        return get_random_song_ignore_requests(sid)
    else:
        offset = random.randint(1, num_available) - 1
        song_id = db.c.fetch_var(
            "SELECT song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, offset)
        )
        return Song.load_from_id(song_id, sid)


def get_shortest_song(sid: int) -> Song:
    """
    Fetch the shortest song available abiding by election block and availability rules.
    """
    sql_query = (
        "FROM r4_song_sid "
        "JOIN r4_songs USING (song_id) "
        "WHERE r4_song_sid.sid = %s "
        "AND song_exists = TRUE "
        "AND song_cool = FALSE "
        "AND song_request_only = FALSE "
        "AND song_elec_blocked = FALSE "
        "ORDER BY song_length"
    )
    song_id = db.c.fetch_var("SELECT song_id " + sql_query + " LIMIT 1", (sid,))
    return Song.load_from_id(song_id, sid)


def get_random_song_ignore_requests(sid: int) -> Song:
    """
    Fetch a random song abiding by election block and availability rules,
    but ignoring request blocking rules.
    """
    sql_query = (
        "FROM r4_song_sid "
        "WHERE r4_song_sid.sid = %s "
        "AND song_exists = TRUE "
        "AND song_cool = FALSE "
        "AND song_request_only = FALSE "
        "AND song_elec_blocked = FALSE "
    )
    num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
    log.debug("song_select", "Song pool size (cooldown, blocks): %s" % num_available)
    offset = 0
    if not num_available or num_available == 0:
        log.warn("song_select", "No songs available while ignoring pending requests.")
        log.debug(
            "song_select",
            "Song select query: SELECT COUNT(song_id) " + (sql_query % (sid,)),
        )
        return get_random_song_ignore_all(sid)
    else:
        offset = random.randint(1, num_available) - 1
        song_id = db.c.fetch_var(
            "SELECT song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, offset)
        )
        return Song.load_from_id(song_id, sid)


def get_random_song_ignore_all(sid: int) -> Song:
    """
    Fetches the most stale song (longest time since it's been played) in the db,
    ignoring all availability and election block rules.
    """
    sql_query = "FROM r4_song_sid WHERE r4_song_sid.sid = %s AND song_exists = TRUE "
    num_available = db.c.fetch_var("SELECT COUNT(song_id) " + sql_query, (sid,))
    offset = 0
    if not num_available or num_available == 0:
        log.critical("song_select", "No songs exist.")
        log.debug(
            "song_select",
            "Song select query: SELECT COUNT(song_id) " + (sql_query % (sid,)),
        )
        raise Exception("Could not find any songs to play.")
    else:
        offset = random.randint(1, num_available) - 1
        song_id = db.c.fetch_var(
            "SELECT song_id " + sql_query + " LIMIT 1 OFFSET %s", (sid, offset)
        )
        return Song.load_from_id(song_id, sid)
