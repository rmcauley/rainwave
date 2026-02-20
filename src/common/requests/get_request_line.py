from time import time as timestamp
from common.db.cursor import RainwaveCursor
from common import log
from common.requests.get_user_top_request import (
    TopRequestSongRow,
    get_top_request_song,
)
from common.requests.request_line_types import (
    LINE_SQL,
    RequestLineEntry,
    RequestLineEntryAction,
    RequestLineSqlRow,
)


async def get_request_line(cursor: RainwaveCursor, sid: int) -> list[RequestLineEntry]:
    line = await cursor.fetch_all(LINE_SQL, {"sid": sid}, row_type=RequestLineSqlRow)

    new_line: list[RequestLineEntry] = []
    process_time = int(timestamp())
    albums_with_requests: set[int] = set()
    position = 1
    user_viewable_position = 1

    # For each person in line
    for row in line:
        user_id = row["user_id"]
        add_to_line = False
        top_request: TopRequestSongRow | None = None
        actions_to_take: set[RequestLineEntryAction] = set()

        # If their time is up, remove them and don't add them to the new line
        if row["line_expiry_tune_in"] and row["line_expiry_tune_in"] <= process_time:
            log.debug(
                "request_line",
                "%s: Removing user ID %s from line for tune in timeout, expiry time %s current time %s"
                % (sid, user_id, row["line_expiry_tune_in"], process_time),
            )
            actions_to_take.add("remove")
        # If the station they're tuned in to matches the station of the line we're processing
        elif row["tuned_in_sid"] == sid:
            # Get their top song ID
            top_request = await get_top_request_song(cursor, user_id, sid)

            if top_request and not row["line_has_had_valid"]:
                row["line_has_had_valid"] = True
                actions_to_take.add("set_request_line_entry_has_had_valid_true")

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
                actions_to_take.add("put_to_back_of_line")
            # If they have no song and they're in 2nd or 1st, start the expiry countdown
            elif not top_request and not row["line_expiry_election"] and position <= 2:
                log.debug(
                    "request_line",
                    "%s: User ID %s has no valid requests, beginning boot countdown."
                    % (sid, user_id),
                )
                row["line_expiry_election"] = process_time + 900
                actions_to_take.add("update_request_line_expiry_election")
                add_to_line = True
            # Keep 'em in line
            else:
                log.debug("request_line", "%s: User ID %s is in line." % (sid, user_id))
                if top_request:
                    albums_with_requests.add(top_request["album_id"])
                add_to_line = True
        elif not row["line_expiry_tune_in"] or row["line_expiry_tune_in"] == 0:
            log.debug(
                "request_line",
                "%s: User ID %s being marked as tuned out." % (sid, user_id),
            )
            actions_to_take.add("update_request_line_entry_expiry_tune_in")
            add_to_line = True
        else:
            log.debug(
                "request_line",
                "%s: User ID %s not tuned in, waiting on expiry for action."
                % (sid, user_id),
            )
            add_to_line = True

        line_entry: RequestLineEntry = {
            "line_expiry_election": row["line_expiry_election"],
            "line_expiry_tune_in": row["line_expiry_tune_in"],
            "line_has_had_valid": row["line_has_had_valid"],
            "line_sid": row["line_sid"],
            "line_wait_start": row["line_wait_start"],
            "position": user_viewable_position,
            "skip": not add_to_line,
            "song": top_request,
            "tuned_in_sid": row["tuned_in_sid"],
            "user_id": row["user_id"],
            "user_requests_paused": row["user_requests_paused"],
            "username": row["username"],
            "actions_to_take": actions_to_take,
        }
        new_line.append(line_entry)
        user_viewable_position = user_viewable_position + 1
        if add_to_line:
            position = position + 1

    return new_line
