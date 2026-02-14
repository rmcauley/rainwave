from common.db.cursor import RainwaveCursor, RainwaveCursorTx
from common.requests.put_user_in_request_line import put_user_in_request_line
from common.requests.remove_user_from_request_line import remove_user_from_request_line
from common.requests.get_user_request_count import get_request_count_for_any_station
from common.requests.request_line_types import RequestLineEntry


async def put_user_to_back_of_request_line(
    cursor: RainwaveCursor | RainwaveCursorTx, entry: RequestLineEntry
) -> None:
    await remove_user_from_request_line(cursor, entry["user_id"])
    # Give them more chances if they still have requests
    # They'll get added to the line of whatever station they're tuned in to (if any!)
    if (
        await get_request_count_for_any_station(cursor, entry["user_id"])
        and entry["tuned_in_sid"]
    ):
        await put_user_in_request_line(
            cursor,
            entry["user_id"],
            entry["user_requests_paused"],
            entry["tuned_in_sid"],
            True if entry["song"] else False,
            # Ignore the existing entry, as it's already been deleted so we intentionally
            # send them to the back of the line.
            existing_line_entry=None,
        )
