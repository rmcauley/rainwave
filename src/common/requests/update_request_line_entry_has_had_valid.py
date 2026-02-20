from common.db.cursor import RainwaveCursor
from common.requests.request_line_types import RequestLineEntry


async def set_request_line_entry_has_had_valid_true(
    cursor: RainwaveCursor, entry: RequestLineEntry
) -> None:
    if entry["line_has_had_valid"]:
        await cursor.update(
            "UPDATE r4_request_line SET line_has_had_valid = TRUE WHERE user_id = %s",
            (entry["user_id"],),
        )
