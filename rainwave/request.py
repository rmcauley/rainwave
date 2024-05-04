from time import time as timestamp
from libs import db
from libs import cache
from libs import log
from rainwave import playlist
from rainwave.user import User

LINE_SQL = "SELECT COALESCE(radio_username, username) AS username, user_id, line_expiry_tune_in, line_expiry_election, line_wait_start, line_has_had_valid FROM r4_request_line JOIN phpbb_users USING (user_id) WHERE r4_request_line.sid = %s AND radio_requests_paused = FALSE ORDER BY line_wait_start"


def update_line(sid):
    # Get everyone in the line
    line = db.c.fetch_all(LINE_SQL, (sid,))
    _process_line(line, sid)


def _process_line(line, sid):
    new_line = []
    # user_positions has user_id as a key and position as the value, this is cached for quick lookups by API requests
    # so users know where they are in line
    user_positions = {}
    t = int(timestamp())
    albums_with_requests = []
    position = 1
    user_viewable_position = 1
    valid_positions = 0
    # For each person
    for row in line:
        add_to_line = False
        u = User(row["user_id"])
        row["song_id"] = None
        # If their time is up, remove them and don't add them to the new line
        if row["line_expiry_tune_in"] and row["line_expiry_tune_in"] <= t:
            log.debug(
                "request_line",
                "%s: Removed user ID %s from line for tune in timeout, expiry time %s current time %s"
                % (sid, u.id, row["line_expiry_tune_in"], t),
            )
            u.remove_from_request_line()
        else:
            tuned_in_sid = db.c.fetch_var(
                "SELECT sid FROM r4_listeners WHERE user_id = %s AND sid = %s AND listener_purge = FALSE",
                (u.id, sid),
            )
            tuned_in = True if tuned_in_sid == sid else False
            if tuned_in:
                # Get their top song ID
                song_id = u.get_top_request_song_id(sid)
                if song_id and not row["line_has_had_valid"]:
                    row["line_has_had_valid"] = True
                    db.c.update(
                        "UPDATE r4_request_line SET line_has_had_valid = TRUE WHERE user_id = %s",
                        (u.id,),
                    )
                if row["line_has_had_valid"]:
                    valid_positions += 1
                # If they have no song and their line expiry has arrived, boot 'em
                if (
                    not song_id
                    and row["line_expiry_election"]
                    and (row["line_expiry_election"] <= t)
                ):
                    log.debug(
                        "request_line",
                        "%s: Removed user ID %s from line for election timeout, expiry time %s current time %s"
                        % (sid, u.id, row["line_expiry_election"], t),
                    )
                    u.remove_from_request_line()
                    # Give them more chances if they still have requests
                    # They'll get added to the line of whatever station they're tuned in to (if any!)
                    if u.has_requests():
                        u.put_in_request_line(u.get_tuned_in_sid())
                # If they have no song and they're in 2nd or 1st, start the expiry countdown
                elif not song_id and not row["line_expiry_election"] and position <= 2:
                    log.debug(
                        "request_line",
                        "%s: User ID %s has no valid requests, beginning boot countdown."
                        % (sid, u.id),
                    )
                    row["line_expiry_election"] = t + 900
                    db.c.update(
                        "UPDATE r4_request_line SET line_expiry_election = %s WHERE user_id = %s",
                        ((t + 900), row["user_id"]),
                    )
                    add_to_line = True
                # Keep 'em in line
                else:
                    log.debug(
                        "request_line", "%s: User ID %s is in line." % (sid, u.id)
                    )
                    if song_id:
                        albums_with_requests.append(
                            db.c.fetch_var(
                                "SELECT album_id FROM r4_songs WHERE song_id = %s",
                                (song_id,),
                            )
                        )
                        row["song"] = db.c.fetch_row(
                            "SELECT song_id AS id, song_title AS title, album_name FROM r4_songs JOIN r4_albums USING (album_id) WHERE song_id = %s",
                            (song_id,),
                        )
                    else:
                        row["song"] = None
                    row["song_id"] = song_id
                    add_to_line = True
            elif not row["line_expiry_tune_in"] or row["line_expiry_tune_in"] == 0:
                log.debug(
                    "request_line",
                    "%s: User ID %s being marked as tuned out." % (sid, u.id),
                )
                db.c.update(
                    "UPDATE r4_request_line SET line_expiry_tune_in = %s WHERE user_id = %s",
                    ((t + 600), row["user_id"]),
                )
                add_to_line = True
            else:
                log.debug(
                    "request_line",
                    "%s: User ID %s not tuned in, waiting on expiry for action."
                    % (sid, u.id),
                )
                add_to_line = True
        row["skip"] = not add_to_line
        row["position"] = user_viewable_position
        new_line.append(row)
        user_positions[u.id] = user_viewable_position
        user_viewable_position = user_viewable_position + 1
        if add_to_line:
            position = position + 1

    log.debug("request_line", "Request line valid positions: %s" % valid_positions)
    cache.set_station(sid, "request_valid_positions", valid_positions)
    cache.set_station(sid, "request_line", new_line, True)
    cache.set_station(sid, "request_user_positions", user_positions, True)

    db.c.update(
        "UPDATE r4_album_sid SET album_requests_pending = NULL WHERE album_requests_pending = TRUE AND sid = %s",
        (sid,),
    )
    for album_id in albums_with_requests:
        db.c.update(
            "UPDATE r4_album_sid SET album_requests_pending = TRUE WHERE album_id = %s AND sid = %s",
            (album_id, sid),
        )

    return new_line


def update_expire_times():
    expiry_times = {}
    for row in db.c.fetch_all("SELECT * FROM r4_request_line"):
        expiry_times[row["user_id"]] = None
        if not row["line_expiry_tune_in"] and not row["line_expiry_election"]:
            pass
        elif row["line_expiry_tune_in"] and not row["line_expiry_election"]:
            expiry_times[row["user_id"]] = row["line_expiry_tune_in"]
        elif row["line_expiry_election"] and not row["line_expiry_tune_in"]:
            expiry_times[row["user_id"]] = row["line_expiry_election"]
        elif row["line_expiry_election"] <= row["line_expiry_tune_in"]:
            expiry_times[row["user_id"]] = row["line_expiry_election"]
        else:
            expiry_times[row["user_id"]] = row["line_expiry_tune_in"]
    cache.set_global("request_expire_times", expiry_times, True)


def get_next_entry(sid):
    line = cache.get_station(sid, "request_line")
    if not line:
        return None, None
    for pos, line_entry in enumerate(line):
        if not line_entry:
            pass  # ?!?!
        elif "skip" in line_entry and line_entry["skip"]:
            log.debug(
                "request",
                "Passing on user %s since they're marked as skippable."
                % line_entry["username"],
            )
        elif not line_entry["song_id"]:
            log.debug(
                "request",
                "Passing on user %s since they have no valid first song."
                % line_entry["username"],
            )
        else:
            return line.pop(pos), line
    return None, None


def mark_request_filled(sid, user, song, entry, line):
    log.debug(
        "request",
        "Fulfilling %s's request for %s." % (user.data["name"], song.filename),
    )
    song.data["elec_request_user_id"] = user.id
    song.data["elec_request_username"] = user.data["name"]

    db.c.update(
        "DELETE FROM r4_request_store WHERE user_id = %s AND song_id = %s",
        (user.id, song.id),
    )
    user.remove_from_request_line()
    request_count = db.c.fetch_var(
        "SELECT COUNT(*) + 1 FROM r4_request_history WHERE user_id = %s", (user.id,)
    )
    db.c.update(
        "DELETE FROM r4_request_store WHERE song_id = %s AND user_id = %s",
        (song.id, user.id),
    )
    db.c.update(
        "INSERT INTO r4_request_history (user_id, song_id, request_wait_time, request_line_size, request_at_count, sid) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (
            user.id,
            song.id,
            timestamp() - entry["line_wait_start"],
            len(line),
            request_count,
            sid,
        ),
    )
    db.c.update(
        "UPDATE phpbb_users SET radio_totalrequests = %s WHERE user_id = %s",
        (request_count, user.id),
    )
    song.update_request_count(sid)


def get_next(sid):
    entry, line = get_next_entry(sid)
    if not entry:
        return None

    user = User(entry["user_id"])
    user.data["name"] = entry["username"]
    song = playlist.Song.load_from_id(entry["song_id"], sid)
    mark_request_filled(sid, user, song, entry, line)

    return song


def get_next_ignoring_cooldowns(sid):
    line = db.c.fetch_all(LINE_SQL, (sid,))

    if not line or len(line) == 0:
        return None

    entry = line[0]
    user = User(entry["user_id"])
    user.data["name"] = entry["username"]
    song = playlist.Song.load_from_id(user.get_top_request_song_id_any(sid), sid)
    mark_request_filled(sid, user, song, entry, line)

    return song
