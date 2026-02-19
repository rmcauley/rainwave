import math
from common.requests.get_user_top_request import TopRequestSongRow
from common.requests.request_line_types import RequestLineEntry
from common import config, log
from common.cache.station_cache import cache_get_station, cache_set_station
from common import log
from common.requests.request_line_types import RequestLineEntry

# These variables keep track of request sequencing.
# Expected behaviour as the request line grows on the site
# is that e.g. two elections in a row get requests, each election
# calling the "is_request_needed" function once, then a gap
# in requests for the third election, then back to 2 elections
# in a row having requests.
# The "gap" is counted by _elections_since_last_request
# The number of fulfillments in a row left to do is controlled by _number_of_elections_to_fulfill_requests.
# The scheduling/election creation functions call here to make changes.
# The dicts are [station id, call count], with memcache filling in values
# when the app restarts.  Even though 1 running instance of this app is supposed to be controlling
# only 1 station, and these variables could then in theory just be an int,
# for safety sake they are programmed to keep track of each station independently.
# The memcache copy of these variables are independent of each station and not stored as a dict,
# so multi-process/threading is safe.
_elections_since_last_request: dict[int, int] = {}
_number_of_elections_to_fulfill_requests: dict[int, int] = {}

ELECTIONS_SINCE_LAST_REQUEST_CACHE_KEY = "elections_since_last_request"
NUMBER_OF_ELECTIONS_TO_FULFILL_REQUESTS_CACHE_KEY = (
    "number_of_elections_to_fulfill_requests"
)


async def _check_for_preparedness(sid: int) -> None:
    global _elections_since_last_request
    global _number_of_elections_to_fulfill_requests

    if not sid in _elections_since_last_request:
        _elections_since_last_request[sid] = (
            await cache_get_station(sid, ELECTIONS_SINCE_LAST_REQUEST_CACHE_KEY)
        ) or 0
    if not sid in _number_of_elections_to_fulfill_requests:
        _number_of_elections_to_fulfill_requests[sid] = (
            await cache_get_station(
                sid, NUMBER_OF_ELECTIONS_TO_FULFILL_REQUESTS_CACHE_KEY
            )
        ) or 0


async def _is_request_needed(sid: int) -> bool:
    await _check_for_preparedness(sid)

    log.debug(
        "requests",
        "Interval %s // Sequence %s"
        % (_elections_since_last_request, _number_of_elections_to_fulfill_requests),
    )

    # If we're ready for a request sequence, start one
    if (
        _elections_since_last_request[sid] > 0
        and _number_of_elections_to_fulfill_requests[sid] <= 0
    ):
        return True
    # If we are in a request sequence, do one
    elif _number_of_elections_to_fulfill_requests[sid] > 0:
        log.debug(
            "requests",
            "Still in sequence.  Remainder: %s"
            % _number_of_elections_to_fulfill_requests[sid],
        )
        return True
    else:
        log.debug(
            "requests",
            "Waiting on interval.  Remainder: %s" % _elections_since_last_request[sid],
        )
        return True


async def _set_elections_since_last_request(sid: int, value: int) -> None:
    global _elections_since_last_request
    _elections_since_last_request[sid] = value
    await cache_set_station(
        sid, ELECTIONS_SINCE_LAST_REQUEST_CACHE_KEY, _elections_since_last_request[sid]
    )


async def increment_elections_since_last_request(sid: int) -> None:
    await _set_elections_since_last_request(sid, _elections_since_last_request[sid] + 1)


async def _set_number_of_elections_to_fulfill_requests(sid: int, value: int) -> None:
    global _number_of_elections_to_fulfill_requests
    _number_of_elections_to_fulfill_requests[sid] = value
    await cache_set_station(
        sid,
        NUMBER_OF_ELECTIONS_TO_FULFILL_REQUESTS_CACHE_KEY,
        _number_of_elections_to_fulfill_requests[sid],
    )


async def _decrement_number_of_elections_to_fulfill_requests(sid: int) -> None:
    await _set_number_of_elections_to_fulfill_requests(
        sid, _number_of_elections_to_fulfill_requests[sid] - 1
    )


def _get_next_request_and_mark_as_fulfilled(
    line: list[RequestLineEntry],
) -> tuple[RequestLineEntry, TopRequestSongRow] | None:
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


async def get_next_request_ignoring_sequencing(
    sid: int, request_line: list[RequestLineEntry]
) -> tuple[RequestLineEntry, TopRequestSongRow] | None:
    users_with_valid_requests = 0
    for entry in request_line:
        if entry["song"]:
            users_with_valid_requests += 1

    fulfilled_request = _get_next_request_and_mark_as_fulfilled(request_line)

    if fulfilled_request:
        # If this variable is <= 0 we are starting a new sequence
        if _number_of_elections_to_fulfill_requests[sid] <= 0:
            sequence_length = math.floor(
                users_with_valid_requests
                / config.stations[sid]["request_sequence_scale"]
            )
            log.debug(
                "requests",
                "Sequence length: %s" % sequence_length,
            )
            await _set_number_of_elections_to_fulfill_requests(sid, sequence_length)
        else:
            await _decrement_number_of_elections_to_fulfill_requests(sid)

        await _set_elections_since_last_request(sid, 0)
    else:
        await increment_elections_since_last_request(sid)

    return fulfilled_request


async def get_next_request_and_mark_as_fulfilled_if_needed(
    sid: int,
    request_line: list[RequestLineEntry],
) -> tuple[RequestLineEntry, TopRequestSongRow] | None:
    global _number_of_elections_to_fulfill_requests

    if not await _is_request_needed(sid):
        await increment_elections_since_last_request(sid)
        return None

    return await get_next_request_ignoring_sequencing(sid, request_line)
