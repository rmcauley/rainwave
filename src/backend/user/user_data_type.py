from typing import TypedDict


class UserData(TypedDict):
    admin: bool
    tuned_in: bool
    perks: bool
    request_position: int
    request_expires_at: int
    rate_anything: bool
    requests_paused: bool
    avatar: str
    listen_key: str | None
    id: int
    name: str
    display_name: str
    sid: str
    lock: bool
    lock_in_effect: bool
    lock_sid: None
    lock_counter: int
    voted_entry: int
    listener_id: int
    _group_id: None
