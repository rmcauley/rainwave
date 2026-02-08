from typing import cast
from common.cache.cache import cache_get, cache_set
from common.db.cursor import RainwaveCursor
from common.requests.request_line_db_schema import RequestLineRow

RequestExpiryTimes = dict[int, int | None]


async def update_request_expire_times(cursor: RainwaveCursor) -> None:
    expiry_times: RequestExpiryTimes = {}
    for row in await cursor.fetch_all(
        "SELECT * FROM r4_request_line", row_type=RequestLineRow
    ):
        expiry_times[row["user_id"]] = None
        if not row["line_expiry_tune_in"] and not row["line_expiry_election"]:
            pass
        elif row["line_expiry_tune_in"] and not row["line_expiry_election"]:
            expiry_times[row["user_id"]] = row["line_expiry_tune_in"]
        elif row["line_expiry_election"] and not row["line_expiry_tune_in"]:
            expiry_times[row["user_id"]] = row["line_expiry_election"]
        elif row["line_expiry_election"] <= row["line_expiry_tune_in"]:
            expiry_times[row["user_id"]] = row["line_expiry_election"]
        else:
            expiry_times[row["user_id"]] = row["line_expiry_tune_in"]

    await cache_set("request_expire_times", expiry_times)


async def get_request_expire_times() -> RequestExpiryTimes:
    return cast(RequestExpiryTimes, await cache_get("request_expire_times") or {})
