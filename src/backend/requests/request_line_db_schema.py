from typing import TypedDict


class RequestLineRow(TypedDict):
    user_id: int
    sid: int
    line_wait_start: int
    line_expiry_tune_in: int
    line_expiry_election: int
    line_has_had_valid: bool
