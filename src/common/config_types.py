from typing import TypedDict


class StationConfig(TypedDict):
    name: str
    description: str
    stream_filename: str
    num_planned_elections: int
    songs_in_election: int
    request_interval: int
    request_sequence_scale: int
    request_tunein_timeout: int
    request_numsong_timeout: int
    song_lookup_length_delta: int
    cooldown_percentage: float
    cooldown_highest_rating_multiplier: float
    cooldown_size_min_multiplier: float
    cooldown_size_max_multiplier: float
    cooldown_size_slope: float
    cooldown_size_slope_start: int
    cooldown_song_min_multiplier: float
    cooldown_song_max_multiplier: float
    cooldown_request_only_period: int
    stream_suffix: str
    tunein_partner_key: str | None
    tunein_partner_id: str | None
    tunein_id: str | None


StationsConfig = dict[int, StationConfig]


class RelayConfig(TypedDict):
    hostname: str
    ip_address: str
    protocol: str
    port: int
    listclients_url: str
    admin_username: str
    admin_password: str
    source_password: str
    sids: list[int]


RelaysConfig = dict[str, RelayConfig]


class PublicRelayConfig(TypedDict):
    name: str
    protocol: str
    hostname: str
    port: int
