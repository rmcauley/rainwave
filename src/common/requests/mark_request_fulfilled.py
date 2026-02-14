from time import time as timestamp
from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.requests.get_user_top_request import TopRequestSongRow
from common.requests.request_line_types import RequestLineEntry
from common.libs import log


async def mark_request_filled(
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
