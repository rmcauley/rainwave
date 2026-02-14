from typing import TypedDict

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


class RequestLineEntry(RequestLineSqlRow):
    song: TopRequestSongRow


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
