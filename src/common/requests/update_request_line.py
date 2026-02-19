from time import time as timestamp

from common import log
from common.cache.station_cache import cache_set_station
from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.requests.get_user_top_request import TopRequestSongRow
from common.requests.put_user_in_request_line import put_user_in_request_line
from common.requests.remove_user_from_request_line import remove_user_from_request_line
from common.requests.request_line_types import RequestLineEntry
from common.requests.request_user_positions import RequestUserPositions
from common.requests.update_request_line_entry_expiry_election import (
    update_request_line_expiry_election,
)
from common.requests.update_request_line_entry_expiry_tune_in import (
    update_request_line_entry_expiry_tune_in,
)
from common.requests.update_request_line_entry_has_had_valid import (
    set_request_line_entry_has_had_valid_true,
)


async def _mark_request_filled(
    cursor: RainwaveCursor | RainwaveCursorTx,
    sid: int,
    entry: RequestLineEntry,
    song: TopRequestSongRow,
) -> None:
    log.debug(
        "request",
        "Fulfilling %s's request for %s." % (entry["username"], song["id"]),
    )

    await cursor.update(
        "DELETE FROM r4_request_store WHERE user_id = %s AND song_id = %s",
        (entry["user_id"], song["id"]),
    )

    await cursor.update(
        """
        INSERT INTO r4_request_history (
            user_id,
            song_id,
            request_wait_time,
            sid
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            entry["user_id"],
            song["id"],
            int(timestamp() - entry["line_wait_start"]),
            sid,
        ),
    )


async def write_updated_request_line_to_db(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int, line: list[RequestLineEntry]
) -> None:
    # user_positions has user_id as a key and position as the value, this is cached for quick lookups by API requests
    # so users know where they are in line
    user_positions: RequestUserPositions = {}

    for entry in line:
        if "remove" in entry["actions_to_take"]:
            await remove_user_from_request_line(cursor, entry["user_id"])

        if "put_to_back_of_line" in entry["actions_to_take"]:
            await remove_user_from_request_line(cursor, entry["user_id"])
            if entry["tuned_in_sid"]:
                await put_user_in_request_line(
                    cursor,
                    entry["user_id"],
                    entry["user_requests_paused"],
                    entry["tuned_in_sid"],
                    True if entry["song"] else False,
                    None,
                )

        if "set_request_line_entry_has_had_valid_true" in entry["actions_to_take"]:
            await set_request_line_entry_has_had_valid_true(cursor, entry)

        if "update_request_line_expiry_election" in entry["actions_to_take"]:
            await update_request_line_expiry_election(cursor, entry)

        if "update_request_line_entry_expiry_tune_in" in entry["actions_to_take"]:
            await update_request_line_entry_expiry_tune_in(cursor, entry)

        if "fulfill" in entry["actions_to_take"] and entry["song"]:
            await _mark_request_filled(cursor, sid, entry, entry["song"])
            await remove_user_from_request_line(cursor, entry["user_id"])
            if entry["tuned_in_sid"]:
                await put_user_in_request_line(
                    cursor,
                    entry["user_id"],
                    entry["user_requests_paused"],
                    entry["tuned_in_sid"],
                    True if entry["song"] else False,
                    None,
                )

        user_positions[entry["user_id"]] = entry["position"]

    await cache_set_station(sid, "request_line", line)
    await cache_set_station(sid, "request_user_positions", user_positions)
