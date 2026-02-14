from common.libs import log
from common.requests.get_user_top_request import TopRequestSongRow
from common.requests.request_line_types import (
    RequestLineEntry,
)


def get_next_request_and_mark_as_fulfilled(
    line: list[RequestLineEntry] | None,
) -> tuple[RequestLineEntry, TopRequestSongRow] | None:
    if not line:
        return None
    for line_entry in line:
        if line_entry["skip"]:
            log.debug(
                "request",
                "Passing on user %s since they're marked as skippable."
                % line_entry["username"],
            )
        elif not line_entry["song"]:
            log.debug(
                "request",
                "Passing on user %s since they have no valid first song."
                % line_entry["username"],
            )
        else:
            line_entry["actions_to_take"].add("fulfill")
            return (line_entry, line_entry["song"])
    return None
