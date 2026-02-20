import random
from psycopg import sql

from common.db.cursor import RainwaveCursor
from common import log

from common.playlist.song.model.song_on_station import SongOnStation


async def get_random_song_ignore_all(cursor: RainwaveCursor, sid: int) -> SongOnStation:
    """
    Fetches the most stale song (longest time since it's been played) in the db,
    ignoring all availability and election block rules.
    """
    sql_query = sql.SQL(
        "FROM r4_song_sid WHERE r4_song_sid.sid = {sid} AND song_exists = TRUE "
    ).format(sid=sql.Placeholder(name="sid"))

    num_available = await cursor.fetch_guaranteed(
        sql.SQL("SELECT COUNT(song_id) {sql_query}").format(sql_query=sql_query),
        {"sid": sid},
        default=0,
        var_type=int,
    )
    offset = 0
    if not num_available or num_available == 0:
        log.critical(f"song_select", "No songs exist on station {sid}.")
        raise Exception("Could not find any songs to play.")
    else:
        offset = random.randint(1, num_available) - 1
        song_id = await cursor.fetch_var(
            sql.SQL("SELECT song_id {sql_query} LIMIT 1 OFFSET {offset}").format(
                sql_query=sql_query,
                offset=sql.Placeholder(name="offset"),
            ),
            {"sid": sid, "offset": offset},
            var_type=int,
        )

        if song_id is None:
            log.critical(
                "song_select",
                f"Song on station {sid} with random offset {offset} could not be loaded.",
            )
            raise Exception("Could not find any songs to play.")
        return await SongOnStation.load(cursor, song_id, sid)


async def get_random_song_ignore_requests(
    cursor: RainwaveCursor, sid: int
) -> SongOnStation:
    """
    Fetch a random song abiding by election block and availability rules,
    but ignoring request blocking rules.
    """
    sql_query = sql.SQL(
        "FROM r4_song_sid "
        "WHERE r4_song_sid.sid = {sid} "
        "AND song_exists = TRUE "
        "AND song_cool = FALSE "
        "AND song_request_only = FALSE "
        "AND song_elec_blocked = FALSE "
    ).format(sid=sql.Placeholder(name="sid"))
    num_available = await cursor.fetch_guaranteed(
        sql.SQL("SELECT COUNT(song_id) {sql_query}").format(sql_query=sql_query),
        {"sid": sid},
        default=0,
        var_type=int,
    )
    log.debug("song_select", "Song pool size (cooldown, blocks): %s" % num_available)
    offset = 0
    if not num_available or num_available == 0:
        log.warn("song_select", "No songs available while ignoring pending requests.")
        return await get_random_song_ignore_all(cursor, sid)
    else:
        offset = random.randint(1, num_available) - 1
        song_id = await cursor.fetch_var(
            sql.SQL("SELECT song_id {sql_query} LIMIT 1 OFFSET {offset}").format(
                sql_query=sql_query,
                offset=sql.Placeholder(name="offset"),
            ),
            {"sid": sid, "offset": offset},
            var_type=int,
        )
        if song_id is None:
            log.critical(
                "song_select",
                f"Song on station {sid} with random offset {offset} could not be loaded.",
            )
            raise Exception("Could not find any songs to play.")
        return await SongOnStation.load(cursor, song_id, sid)


async def get_random_song(cursor: RainwaveCursor, sid: int) -> SongOnStation:
    """
    Fetch a random song, abiding by all election block, request block, and
    availability rules.  Falls back to get_random_ignore_requests on failure.
    """

    sql_query = sql.SQL(
        "FROM r4_song_sid "
        "JOIN r4_songs USING (song_id) "
        "JOIN r4_album_sid ON (r4_album_sid.album_id = r4_songs.album_id AND r4_album_sid.sid = r4_song_sid.sid) "
        "WHERE r4_song_sid.sid = {sid} "
        "AND song_exists = TRUE "
        "AND song_cool = FALSE "
        "AND song_request_only = FALSE "
        "AND song_elec_blocked = FALSE "
        "AND album_requests_pending IS NULL"
    ).format(sid=sql.Placeholder(name="sid"))
    num_available = await cursor.fetch_guaranteed(
        sql.SQL("SELECT COUNT(song_id) {sql_query}").format(sql_query=sql_query),
        {"sid": sid},
        default=0,
        var_type=int,
    )
    log.info(
        "song_select", "Song pool size (cooldown, blocks, requests): %s" % num_available
    )
    offset = 0
    if not num_available or num_available == 0:
        log.warn("song_select", "No songs available despite no timing rules.")
        return await get_random_song_ignore_requests(cursor, sid)
    else:
        offset = random.randint(1, num_available) - 1
        song_id = await cursor.fetch_var(
            sql.SQL("SELECT song_id {sql_query} LIMIT 1 OFFSET {offset}").format(
                sql_query=sql_query,
                offset=sql.Placeholder(name="offset"),
            ),
            {"sid": sid, "offset": offset},
            var_type=int,
        )
        if song_id is None:
            log.critical(
                "song_select",
                f"Song on station {sid} with random offset {offset} could not be loaded.",
            )
            raise Exception("Could not find any songs to play.")
        return await SongOnStation.load(cursor, song_id, sid)


async def get_random_song_timed(
    cursor: RainwaveCursor,
    sid: int,
    *,
    target_seconds: int | None = None,
    target_delta: int,
) -> SongOnStation:
    """
    Fetch a random song abiding by all election block, request block, and
    availability rules, but giving priority to the target song length
    provided.  Falls back to get_random_song on failure.
    """
    if not target_seconds:
        return await get_random_song(cursor, sid)

    sql_query = sql.SQL(
        "FROM r4_song_sid "
        "JOIN r4_songs USING (song_id) "
        "JOIN r4_album_sid ON (r4_album_sid.album_id = r4_songs.album_id AND r4_album_sid.sid = r4_song_sid.sid) "
        "WHERE r4_song_sid.sid = {sid} "
        "AND song_exists = TRUE "
        "AND song_cool = FALSE "
        "AND song_elec_blocked = FALSE "
        "AND album_requests_pending IS NULL "
        "AND song_request_only = FALSE "
        "AND song_length >= {lower_bound} AND song_length <= {upper_bound}"
    ).format(
        sid=sql.Placeholder(name="sid"),
        lower_bound=sql.Placeholder(name="lower_bound"),
        upper_bound=sql.Placeholder(name="upper_bound"),
    )
    lower_target_bound = target_seconds - (target_delta / 2)
    upper_target_bound = target_seconds + (target_delta / 2)
    num_available = await cursor.fetch_guaranteed(
        sql.SQL("SELECT COUNT(r4_song_sid.song_id) {sql_query}").format(
            sql_query=sql_query
        ),
        {
            "sid": sid,
            "lower_bound": lower_target_bound,
            "upper_bound": upper_target_bound,
        },
        default=0,
        var_type=int,
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
        return await get_random_song(cursor, sid)
    else:
        offset = random.randint(1, num_available) - 1
        song_id = await cursor.fetch_var(
            sql.SQL(
                "SELECT r4_song_sid.song_id {sql_query} LIMIT 1 OFFSET {offset}"
            ).format(
                sql_query=sql_query,
                offset=sql.Placeholder(name="offset"),
            ),
            {
                "sid": sid,
                "lower_bound": lower_target_bound,
                "upper_bound": upper_target_bound,
                "offset": offset,
            },
            var_type=int,
        )
        if song_id is None:
            log.critical(
                "song_select",
                f"Song on station {sid} with random offset {offset} could not be loaded.",
            )
            raise Exception("Could not find any songs to play.")
        return await SongOnStation.load(cursor, song_id, sid)


async def get_shortest_song(cursor: RainwaveCursor, sid: int) -> SongOnStation:
    """
    Fetch the shortest song available abiding by election block and availability rules.
    """
    sql_query = sql.SQL(
        "FROM r4_song_sid "
        "JOIN r4_songs USING (song_id) "
        "WHERE r4_song_sid.sid = {sid} "
        "AND song_exists = TRUE "
        "AND song_cool = FALSE "
        "AND song_request_only = FALSE "
        "AND song_elec_blocked = FALSE "
        "ORDER BY song_length"
    ).format(sid=sql.Placeholder(name="sid"))
    song_id = await cursor.fetch_var(
        sql.SQL("SELECT song_id {sql_query} LIMIT 1").format(sql_query=sql_query),
        {"sid": sid},
        var_type=int,
    )
    if song_id is None:
        log.critical(
            "song_select",
            f"Shortest song on station could not be loaded.",
        )
        raise Exception(f"Could not find shortest song on station {sid}.")
    return await SongOnStation.load(cursor, song_id, sid)
