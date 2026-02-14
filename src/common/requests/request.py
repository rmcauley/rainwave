from time import time as timestamp
from common.cache import cache
from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.libs import log
from common.requests.put_user_in_request_line import put_user_in_request_line
from common.requests.get_user_request_count import get_request_count_for_any_station
from common.requests.get_user_top_request import (
    TopRequestSongRow,
    get_top_request_song,
)
from common.requests.remove_user_from_request_line import remove_user_from_request_line
from common.requests.request_line_types import RequestLineSqlRow
from common.requests.request_user_positions import RequestUserPositions


async def _process_line(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int, line: list[RequestLineSqlRow]
) -> list[RequestLineSqlRow]:
    # user_positions has user_id as a key and position as the value, this is cached for quick lookups by API requests
    # so users know where they are in line
    user_positions: RequestUserPositions = {}

    new_line = []
    process_time = int(timestamp())
    albums_with_requests: set[int] = set()
    position = 1
    user_viewable_position = 1
    valid_positions = 0

    # For each person in line
    for row in line:
        user_id = row["user_id"]
        add_to_line = False
        top_request: TopRequestSongRow | None = None

        # If their time is up, remove them and don't add them to the new line
        if row["line_expiry_tune_in"] and row["line_expiry_tune_in"] <= process_time:
            log.debug(
                "request_line",
                "%s: Removed user ID %s from line for tune in timeout, expiry time %s current time %s"
                % (sid, user_id, row["line_expiry_tune_in"], process_time),
            )
            await remove_user_from_request_line(cursor, user_id)
        # If the station they're tuned in to matches the station of the line we're processing
        elif row["tuned_in_sid"] == sid:
            # Get their top song ID
            top_request = await get_top_request_song(
                cursor, user_id, sid
            )

            if top_request and not row["line_has_had_valid"]:
                row["line_has_had_valid"] = True
                await cursor.update(
                    "UPDATE r4_request_line SET line_has_had_valid = TRUE WHERE user_id = %s",
                    (user_id,),
                )
            if row["line_has_had_valid"]:
                valid_positions += 1

            # If they have no song and their line expiry has arrived, boot 'em
            if (
                not top_request
                and row["line_expiry_election"]
                and (row["line_expiry_election"] <= process_time)
            ):
                log.debug(
                    "request_line",
                    "%s: Removed user ID %s from line for election timeout, expiry time %s current time %s"
                    % (sid, user_id, row["line_expiry_election"], process_time),
                )
                await remove_user_from_request_line(cursor, user_id)
                # Give them more chances if they still have requests
                # They'll get added to the line of whatever station they're tuned in to (if any!)
                if (
                    await get_request_count_for_any_station(cursor, user_id)
                    and row["tuned_in_sid"]
                ):
                    await put_user_in_request_line(
                        cursor,
                        user_id,
                        row["user_requests_paused"],
                        row["tuned_in_sid"],
                        True if top_request else False,
                        # Ignore the existing entry, as it's already been deleted so we intentionally
                        # send them to the back of the line.
                        existing_line_entry=None,
                    )
            # If they have no song and they're in 2nd or 1st, start the expiry countdown
            elif not top_request and not row["line_expiry_election"] and position <= 2:
                log.debug(
                    "request_line",
                    "%s: User ID %s has no valid requests, beginning boot countdown."
                    % (sid, user_id),
                )
                row["line_expiry_election"] = process_time + 900
                await cursor.update(
                    "UPDATE r4_request_line SET line_expiry_election = %s WHERE user_id = %s",
                    ((process_time + 900), row["user_id"]),
                )
                add_to_line = True
            # Keep 'em in line
            else:
                log.debug("request_line", "%s: User ID %s is in line." % (sid, user_id))
                if top_request:
                    albums_with_requests.add(top_request['album_id'])
                        await cursor.fetch_var(
                            "SELECT album_id FROM r4_songs WHERE song_id = %s",
                            (song_id,),
                        )
                    )
                    row["song"] = await cursor.fetch_row(
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
                "%s: User ID %s being marked as tuned out." % (sid, user_id),
            )
            await cursor.update(
                "UPDATE r4_request_line SET line_expiry_tune_in = %s WHERE user_id = %s",
                ((process_time + 600), row["user_id"]),
            )
            add_to_line = True
        else:
            log.debug(
                "request_line",
                "%s: User ID %s not tuned in, waiting on expiry for action."
                % (sid, user_id),
            )
            add_to_line = True
        row["skip"] = not add_to_line
        row["position"] = user_viewable_position
        new_line.append(row)
        user_positions[user_id] = user_viewable_position
        user_viewable_position = user_viewable_position + 1
        if add_to_line:
            position = position + 1

    log.debug("request_line", "Request line valid positions: %s" % valid_positions)
    cache.set_station(sid, "request_valid_positions", valid_positions)
    cache.set_station(sid, "request_line", new_line, True)
    cache.set_station(sid, "request_user_positions", user_positions, True)

    await cursor.update(
        "UPDATE r4_album_sid SET album_requests_pending = NULL WHERE album_requests_pending = TRUE AND sid = %s",
        (sid,),
    )
    for album_id in albums_with_requests:
        await cursor.update(
            "UPDATE r4_album_sid SET album_requests_pending = TRUE WHERE album_id = %s AND sid = %s",
            (album_id, sid),
        )

    return new_line


async def update_line(sid: int) -> None:
    # Get everyone in the line
    line = await cursor.fetch_all(LINE_SQL, (sid,))
    _process_line(line, sid)


def get_next_entry(
    sid: int,
) -> tuple[dict[str, Any] | None, list[dict[str, Any]] | None]:
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


def mark_request_filled(
    sid: int,
    user: User,
    song: playlist.Song,
    entry: dict[str, Any],
    line: list[dict[str, Any]],
) -> None:
    log.debug(
        "request",
        "Fulfilling %s's request for %s." % (user.data["name"], song.filename),
    )
    song.data["elec_request_user_id"] = user.id
    song.data["elec_request_username"] = user.data["name"]

    await cursor.update(
        "DELETE FROM r4_request_store WHERE user_id = %s AND song_id = %s",
        (user.id, song.id),
    )
    user.remove_from_request_line()
    request_count = await cursor.fetch_var(
        "SELECT COUNT(*) + 1 FROM r4_request_history WHERE user_id = %s", (user.id,)
    )
    await cursor.update(
        "DELETE FROM r4_request_store WHERE song_id = %s AND user_id = %s",
        (song.id, user.id),
    )
    await cursor.update(
        """
        INSERT INTO r4_request_history (
            user_id,
            song_id,
            request_wait_time,
            request_line_size,
            request_at_count,
            sid
        )
        VALUES (%s, %s, %s, %s, %s, %s)
""",
        (
            user.id,
            song.id,
            timestamp() - entry["line_wait_start"],
            len(line),
            request_count,
            sid,
        ),
    )
    await cursor.update(
        "UPDATE phpbb_users SET radio_totalrequests = %s WHERE user_id = %s",
        (request_count, user.id),
    )
    song.update_request_count(sid)


def get_next(sid: int) -> playlist.Song | None:
    entry, line = get_next_entry(sid)
    if not entry:
        return None

    user = make_user(entry["user_id"])
    user.data["name"] = entry["username"]
    song = playlist.Song.load_from_id(entry["song_id"], sid)
    mark_request_filled(sid, user, song, entry, line)

    return song


def get_next_ignoring_cooldowns(sid: int) -> playlist.Song | None:
    line = await cursor.fetch_all(LINE_SQL, (sid,))

    if not line or len(line) == 0:
        return None

    entry = line[0]
    user = make_user(entry["user_id"])
    user.data["name"] = entry["username"]
    song = playlist.Song.load_from_id(user.get_top_request_song_id_any(sid), sid)
    mark_request_filled(sid, user, song, entry, line)

    return song
