from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.requests.request_line_types import RequestLineEntry


async def update_albums_with_requests_flag(
    cursor: RainwaveCursor | RainwaveCursorTx, sid: int, line: list[RequestLineEntry]
) -> None:
    await cursor.update(
        "UPDATE r4_album_sid SET album_requests_pending = NULL WHERE album_requests_pending = TRUE AND sid = %s",
        (sid,),
    )
    albums_with_requests: set[int] = set()
    for entry in line:
        if entry["song"]:
            albums_with_requests.add(entry["song"]["album_id"])
    for album_id in albums_with_requests:
        await cursor.update(
            "UPDATE r4_album_sid SET album_requests_pending = TRUE WHERE album_id = %s AND sid = %s",
            (album_id, sid),
        )
