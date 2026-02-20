from common.db.cursor import RainwaveCursor
from common.requests.request_line_types import RequestLineEntry


async def update_request_line_expiry_election(
    cursor: RainwaveCursor, entry: RequestLineEntry
) -> None:
    await cursor.update(
        "UPDATE r4_request_line SET line_expiry_election = %s WHERE user_id = %s",
        (entry["line_expiry_election"], entry["user_id"]),
    )
