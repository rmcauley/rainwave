from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.requests.request_line_types import RequestLineEntry


async def update_request_line_entry_expiry_tune_in(
    cursor: RainwaveCursor | RainwaveCursorTx, entry: RequestLineEntry
) -> None:
    await cursor.update(
        "UPDATE r4_request_line SET line_expiry_tune_in = %s WHERE user_id = %s",
        (entry["line_expiry_tune_in"], entry["user_id"]),
    )
