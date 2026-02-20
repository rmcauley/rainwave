from typing import TypedDict


class UserPublicData(TypedDict):
    avatar: str
    id: int
    name: str


class UserPrivateData(TypedDict):
    admin: bool
    listen_key: str
    lock_counter: int | None
    lock_in_effect: bool
    lock_sid: int | None
    lock: bool
    perks: bool
    rate_anything: bool
    request_expires_at: int | None
    request_position: int | None
    requests_paused: bool
    tuned_in: bool
    voted_entry: int | None


class UserServerData(TypedDict):
    group_id: int
    listener_id: int | None
    listener_sid: int | None


class UserRefreshDataRow(TypedDict):
    avatar_type: str
    avatar: str | None
    group_id: int
    id: int
    listen_key: str
    listener_id: int | None
    listener_lock_counter: int | None
    listener_lock_sid: int | None
    listener_lock: bool | None
    listener_sid: int | None
    listener_voted_entry: int | None
    name: str
    requests_paused: bool
    total_ratings: int


class RequestStoreRow(TypedDict):
    song_id: int
    album_id: int
