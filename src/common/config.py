import os
from typing import Literal, TypedDict, TypeAlias


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


StationsConfig: TypeAlias = dict[int, StationConfig]


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


RelaysConfig: TypeAlias = dict[str, RelayConfig]


class PublicRelayConfig(TypedDict):
    name: str
    protocol: str
    hostname: str
    port: int


# Enable Tornado's module auto-reloading, and enable local-only test URLs to allow you to assume user roles.
developer_mode = False

log_dir: str | None = None
# Levels: "debug" "info" "warn" "error" "critical"
log_level: Literal["critical"] = "critical"

# What host the API resides on relative to the song change API.
# Used internally for the song change api to talk to the API.
# If everything is on the same machine, leave it at 127.0.0.1!
# Change this if you are using different machines for the web API and song change API.
api_url = "127.0.0.1"

# Start the web API at this port, increase by 1 for each process spawned.
api_base_port = 20000

# How many web processes (not threads) to start
api_num_processes = 1

# What IPs do connections from the backend (music) come from as the API (web) sees it?
# If everything is on the same machine, leave it at this!
api_trusted_ip_addresses = ["127.0.0.1", ":1"]

# What does the API address look like for end-user browsers?
api_external_url_prefix = "//localhost:20000/api4/"

# If you need to run WebSockets on a different host because of
# any sort of CDN (e.g. CloudFlare) , enter a host here.
# If you're not using a CDN, leave as None.
# An example would be 'websockets.mydomain.com'
websocket_host: str = ""

# What domains/IP addresses should WebSocket connections be allowed from?
# Set to * to allow from anywhere.
websocket_allow_from = "localhost"


# Base URL of your site.
hostname = "localhost"
base_site_url = "http://localhost/"
# Set cookie_domain to blank for localhost.
cookie_domain = ""
enforce_ssl = False

# Base port of the song changing API listener
backend_port = 21000

# Database configuration
db_host = os.getenv("RW_TEST_DB_HOST", None)
db_port = os.getenv("RW_TEST_DB_PORT", None)
db_user = os.getenv("RW_TEST_DB_USER", None)
db_password = os.getenv("RW_TEST_DB_PASSWORD", None)
db_name = os.getenv("RW_TEST_DB_NAME", "rainwave_test")

# What ports to use internally for messaging.
# You don't need to install anything or setup a server
# but these ports do need to be open for Rainwave to use.
# If you're running everything on 1 server, leave these alone.
# If you're splitting Rainwave across multiple servers, change IP address to *.
zeromq_pub = "tcp://127.0.0.1:19998"
zeromq_sub = "tcp://127.0.0.1:19999"

memcache_host = "127.0.0.1"
memcache_port = 11211
memcache_connect_timeout = 1.0
memcache_timeout = 5.0

# How long do you want to keep old data around? (in seconds)
# How long to keep 'events' for e.g. power hours
trim_event_age = 2592000
# How long to keep decided elections for
trim_election_age = 86400
# How many songs worth of playback history to keep
trim_history_length = 1000

# Where to store resized album art processed by Rainwave.
album_art_file_path = "/var/www/mydomain.com/static/album_art"
# URL that browsers will load art from."
album_art_url_path = "/static/album_art"
# Order of importance of album art, e.g. station 1 should use album art from 1, then 6, etc.
album_art_order: dict[int, list[int]] = {
    1: [1, 6, 4, 2],
    2: [2, 4],
    3: [3, 4, 6, 2],
    4: [4, 6, 1, 2, 3],
    5: [2, 4, 1, 6, 3],
    6: [6, 1, 4, 2, 3],
}

# How many ratings until Rainwave will show a public rating on the site?
rating_threshold_for_calc = 10
# How many ratings until a user is allowed to rate eveything freely?
rating_allow_all_threshold = 1000

# How many weeks to give songs/albums low cooldown after being added
cooldown_age_threshold = 5
# (detailed configuration of low cooldown formula)"
cooldown_age_stage2_start = 1
cooldown_age_stage2_min_multiplier = 0.7
cooldown_age_stage1_min_multiplier = 0.4

# Accept automated Javascript error reports from these hosts. (spam prevention)
# hostname configuration directive is automatically included.
accept_error_reports_from_hosts = ["localhost"]

# Domain name that has address records for all your Icecast servers.
# If you only have 1 Icecast server, put it here.
# If you don't understand, put your primary Icecast server here.
round_robin_relay_host = "allrelays.mydomain.com"
round_robin_relay_protocol = "https://"
round_robin_relay_port = ""

# Configure a station block for every station you need.
# IDs are converted to integers; strings are not allowed and will break the app.
# This array is sensitive - do not add extra data as it could cause Rainwave to not start.
stations: StationsConfig = {
    1: {
        # Station name to display to users
        "name": "Station",
        # Shows on Icecast servers and directories
        "description": "",
        # If your audio is at http://icecast/station.mp3, enter 'station' here.
        # This is your 'mount' option in Icecast/LiquidSoap minus .mp3.
        # This is also the directory your station will show under your primary host.
        "stream_filename": "station",
        # Default number of elections to plan and display on the site at once.
        "num_planned_elections": 2,
        # Default number of songs in an election.
        "songs_in_election": 3,
        # Default number of random-song-only elections to put in between elections with requests.
        "request_interval": 1,
        # How many users in the request line until we start increasing sequential elections with requests?
        "request_sequence_scale": 5,
        # How long after a user tunes out until they lose their place in the request line?
        "request_tunein_timeout": 600,
        # How many songs can a user sit at the head of the request line without a song before losing their place?
        "request_numsong_timeout": 2,
        # Elections first try to find songs of similar length - this defines how similar, in seconds.
        "song_lookup_length_delta": 30,
        # Cooldown formula tweaking.  Recommended to leave this alone!
        "cooldown_percentage": 0.6,
        "cooldown_highest_rating_multiplier": 0.6,
        "cooldown_size_min_multiplier": 0.4,
        "cooldown_size_max_multiplier": 1.0,
        "cooldown_size_slope": 0.1,
        "cooldown_size_slope_start": 20,
        "cooldown_song_min_multiplier": 0.3,
        "cooldown_song_max_multiplier": 3.3,
        "cooldown_request_only_period": 1800,
        # Suffix to add to song titles when using LiquidSoap.
        "stream_suffix": " [Rainwave]",
        # Use if you have an entry on TuneIn.com that you want updated
        "tunein_partner_key": None,
        "tunein_partner_id": None,
        "tunein_id": None,
    },
    2: {
        # Station name to display to users
        "name": "Station 2",
        # Shows on Icecast servers and directories
        "description": "",
        # If your audio is at http://icecast/station.mp3, enter 'station' here.
        # This is your 'mount' option in Icecast/LiquidSoap minus .mp3.
        # This is also the directory your station will show under your primary host.
        "stream_filename": "station2",
        # Default number of elections to plan and display on the site at once.
        "num_planned_elections": 2,
        # Default number of songs in an election.
        "songs_in_election": 3,
        # Default number of random-song-only elections to put in between elections with requests.
        "request_interval": 1,
        # How many users in the request line until we start increasing sequential elections with requests?
        "request_sequence_scale": 5,
        # How long after a user tunes out until they lose their place in the request line?
        "request_tunein_timeout": 600,
        # How many songs can a user sit at the head of the request line without a song before losing their place?
        "request_numsong_timeout": 2,
        # Elections first try to find songs of similar length - this defines how similar, in seconds.
        "song_lookup_length_delta": 30,
        # Cooldown formula tweaking.  Recommended to leave this alone!
        "cooldown_percentage": 0.6,
        "cooldown_highest_rating_multiplier": 0.6,
        "cooldown_size_min_multiplier": 0.4,
        "cooldown_size_max_multiplier": 1.0,
        "cooldown_size_slope": 0.1,
        "cooldown_size_slope_start": 20,
        "cooldown_song_min_multiplier": 0.3,
        "cooldown_song_max_multiplier": 3.3,
        "cooldown_request_only_period": 1800,
        # Suffix to add to song titles when using LiquidSoap.
        "stream_suffix": " [Station 2]",
        # Use if you have an entry on TuneIn.com that you want updated
        "tunein_partner_key": None,
        "tunein_partner_id": None,
        "tunein_id": None,
    },
}

default_station = 1

# Used for whitelisting API requests from relays and obtaining statistics.
# Also used to generate accurate M3U files containing all relays.
relays: RelaysConfig = {
    "sample": {
        "hostname": "mydomain.com",
        "ip_address": "127.0.0.1",
        "protocol": "http://",
        "port": 8000,
        "listclients_url": "/admin/listclients",
        "admin_username": "admin",
        "admin_password": "admin",
        "source_password": "source",
        "sids": [1],
    }
}

song_dirs = {
    "/home/rainwave/music": [1],
}
monitor_dir = "/home/rainwave/music"

discord_client_id = ""
discord_client_secret = ""
