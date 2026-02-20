from typing import Literal, TypedDict

from psycopg import sql

from common.requests.get_user_top_request import TopRequestSongRow


class RequestLineSqlRow(TypedDict):
    username: str
    line_sid: int
    user_id: int
    user_requests_paused: bool
    line_expiry_tune_in: int | None
    line_expiry_election: int | None
    line_wait_start: int
    line_has_had_valid: bool
    tuned_in_sid: int | None


# remove = await remove_user_from_request_line(cursor, user_id)
# put_to_back_of_line = await put_user_to_back_of_request_line
# set_request_line_entry_has_had_valid_true = set_request_line_entry_has_had_valid_true
# update_request_line_expiry_election = update_request_line_expiry_election
# update_request_line_entry_expiry_tune_in = update_request_line_entry_expiry_tune_in
RequestLineEntryAction = Literal[
    "remove",
    "put_to_back_of_line",
    "set_request_line_entry_has_had_valid_true",
    "update_request_line_expiry_election",
    "update_request_line_entry_expiry_tune_in",
    "fulfill",
]


class RequestLineEntry(RequestLineSqlRow):
    song: TopRequestSongRow | None
    skip: bool
    position: int
    actions_to_take: set[RequestLineEntryAction]


LINE_SQL = sql.SQL(
    """
    SELECT 
        COALESCE(radio_username, username) AS username, 
        r4_request_line.sid AS line_sid,
        user_id,
        radio_requests_paused AS user_requests_paused,
        line_expiry_tune_in, 
        line_expiry_election, 
        line_wait_start, 
        line_has_had_valid,
        r4_listeners.sid AS tuned_in_sid
    FROM r4_request_line 
        JOIN phpbb_users USING (user_id) 
        LEFT JOIN r4_listeners ON (
            r4_request_line.user_id = r4_listeners.user_id
            AND listener_purge = FALSE
        )
    WHERE 
        r4_request_line.sid = {sid}
        AND radio_requests_paused = FALSE 
    ORDER BY line_wait_start
"""
).format({"sid": sql.Placeholder(name="sid")})

LINE_ENTRY_SQL_FOR_USER_ID = sql.SQL(
    """
    SELECT 
        COALESCE(radio_username, username) AS username, 
        r4_request_line.sid AS line_sid,
        user_id,
        radio_requests_paused AS user_requests_paused,
        line_expiry_tune_in, 
        line_expiry_election, 
        line_wait_start, 
        line_has_had_valid,
        r4_listeners.sid AS tuned_in_sid
    FROM r4_request_line 
        JOIN phpbb_users USING (user_id) 
        LEFT JOIN r4_listeners ON (
            r4_request_line.user_id = r4_listeners.user_id
            AND listener_purge = FALSE
        )
    WHERE 
        r4_request_line.user_id = {user_id}
    ORDER BY line_wait_start
"""
).format({"user_id": sql.Placeholder(name="user_id")})
