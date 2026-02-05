import orjson

from typing import TypedDict, TypeAlias


class RatingMapEntry(TypedDict):
    threshold: float
    points: float


RatingMap: TypeAlias = list[RatingMapEntry]


class StationConfig(TypedDict):
    name: str
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
    cooldown_enable_for_categories: bool
    stream_suffix: str
    tunein_partner_key: str | None
    tunein_partner_id: int
    tunein_id: int
    directories: list[str]


StationsConfig: TypeAlias = dict[int, StationConfig]


class RelayConfig(TypedDict):
    hostname: str
    ip_address: str
    protocol: str
    port: int
    listclients_url: str
    admin_username: str
    admin_password: str
    sids: list[int]


RelaysConfig: TypeAlias = dict[str, RelayConfig]


class PublicRelayConfig(TypedDict):
    name: str
    protocol: str
    hostname: str
    port: int


# Enable Tornado's module auto-reloading, and enable local-only test URLs to allow you to assume user roles.
developer_mode = False

log_dir = None
# Levels: "debug" "info" "warn" "error" "critical"
log_level = "critical"

# What host the API resides on relative to the song change API.
# Used internally for the song change api to talk to the API.
# If everything is on the same machine, leave it at 127.0.0.1!
# Change this if you are using different machines for the web API and song change API.
web_api_url = "127.0.0.1"

# Start the web API at this port, increase by 1 for each process spawned.
web_api_base_port = 20000

# What IPs do connections from the backend (music) come from as the API (web) sees it?
# If everything is on the same machine, leave it at this!
web_api_trusted_ip_addresses = ["127.0.0.1", ":1"]

# What does the API address look like for end-user browsers?
web_api_external_url_prefix = "//localhost:20000/api4/"

# If you need to run WebSockets on a different host because of
# any sort of CDN (e.g. CloudFlare) , enter a host here.
# If you're not using a CDN, leave as None.
# An example would be 'websockets.mydomain.com'
websocket_host = None

# What domains/IP addresses should WebSocket connections be allowed from?
# Set to * to allow from anywhere.
websocket_allow_from = "localhost"

# Base URL of your site.
hostname = "localhost"
base_site_url = "http://localhost/"
enforce_ssl = False

# Backend configuration.
song_change_api_port = 21000

# Database configuration
db_name = "rainwave"
db_host = None
db_port = None
db_user = "user"
db_password = "password"

# What ports to use internally for messaging.
# You don't need to install anything or setup a server
# but these ports do need to be open for Rainwave to use.
# If you're running everything on 1 server, leave these alone.
# If you're splitting Rainwave across multiple servers, change IP address to *.
zeromq_pub = "tcp://127.0.0.1:19998"
zeromq_sub = "tcp://127.0.0.1:19999"

# memcache_fake = True is for unit testing, set to False to use a real memcache server.
# Using True in production will cause a whole ton of problems for you. :)
memcache_fake = True
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

# Enable album art processing.
album_art_enabled = False
# Where to store resized album art processed by Rainwave.
album_art_file_path = "/var/www/mydomain.com/static/album_art"
# URL that browsers will load art from."
album_art_url_path = "/static/album_art"
# When saving album art, what station ID takes priority when 1 album has multiple art?
album_art_master_sid = 1

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

# Set to True if using LiquidSoap.
liquidsoap_annotations = False

# Set cookie_domain to blank for localhost.
cookie_domain = ""

# Accept automated Javascript error reports from these hosts. (spam prevention)
# hostname configuration directive is automatically included.
accept_error_reports_from_hosts = ["localhost"]

# Map user-facing ratings to raw points in the rating formula.
rating_map: "RatingMap" = [
    {"threshold": 0, "points": -0.2},
    {"threshold": 1.5, "points": 0.0},
    {"threshold": 2.0, "points": 0.1},
    {"threshold": 2.5, "points": 0.2},
    {"threshold": 3.0, "points": 0.5},
    {"threshold": 3.5, "points": 0.75},
    {"threshold": 4.0, "points": 0.9},
    {"threshold": 4.5, "points": 1.0},
    {"threshold": 5.0, "points": 1.1},
]

# Domain name that has address records for all your Icecast servers.
# If you only have 1 Icecast server, put it here.
# If you don't understand, put your primary Icecast server here.
round_robin_relay_host = "allrelays.mydomain.com"
round_robin_relay_protocol = "https://"
round_robin_relay_port = ""

# Configure a station block for every station you need.
# IDs are converted to integers; strings are not allowed and will break the app.
# This array is sensitive - do not add extra data as it could cause Rainwave to not start.
stations: "StationsConfig" = {
    1: {
        # Station name to display to users
        "name": "Station",
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
        # Enable cooldowns for categrories.
        "cooldown_enable_for_categories": True,
        # Suffix to add to song titles when using LiquidSoap.
        "stream_suffix": " [Rainwave]",
        # Use if you have an entry on TuneIn.com that you want updated
        "tunein_partner_key": None,
        "tunein_partner_id": 0,
        "tunein_id": 0,
        # What directories are MP3 files in for this station?
        "directories": ["/home/radio/music"],
    },
    2: {
        # Station name to display to users
        "name": "Station 2",
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
        # Enable cooldowns for categrories.
        "cooldown_enable_for_categories": True,
        # Suffix to add to song titles when using LiquidSoap.
        "stream_suffix": " [Station 2]",
        # Use if you have an entry on TuneIn.com that you want updated
        "tunein_partner_key": None,
        "tunein_partner_id": 0,
        "tunein_id": 0,
        # What directories are MP3 files in for this station?
        "directories": [],
    },
}

default_station = 1

# Used for whitelisting API requests from relays and obtaining statistics.
# Also used to generate accurate M3U files containing all relays.
relays: "RelaysConfig" = {
    "sample": {
        "hostname": "mydomain.com",
        "ip_address": "127.0.0.1",
        "protocol": "http://",
        "port": 8000,
        "listclients_url": "/admin/listclients",
        "admin_username": "admin",
        "admin_password": "admin",
        "sids": [1],
    }
}

enable_replaygain = True

build_number = 0

station_ids: set[int] = set(k for k in stations.keys())
station_id_friendly: dict[int, str] = {sid: v["name"] for (sid, v) in stations.items()}

station_mount_filenames = {sid: v["stream_filename"] for (sid, v) in stations.items()}
stream_filename_to_sid: dict[str, int] = {
    v["stream_filename"]: sid for (sid, v) in stations.items()
}
csp_header = ""

# Used to generate URLs for listeners to tune in to
public_relays: dict[int, list[PublicRelayConfig]] = {}
# Used for pre-dumped object to stuff into requests
public_relays_json = {}

# Used to generate CSP security headers for browsers
relay_hostnames: set[str] = set()
relay_hostnames.add(round_robin_relay_protocol + round_robin_relay_host)

for sid in station_ids:
    public_relays[sid] = []
    for relay_name, relay in relays.items():
        if sid in relay["sids"]:
            public_relays[sid].append(
                {
                    "name": relay_name,
                    "protocol": relay["protocol"],
                    "hostname": relay["hostname"],
                    "port": relay["port"],
                }
            )
            relay_hostnames.add(relay["protocol"] + relay["hostname"])
            relay_hostnames.add(
                "{}{}:{}".format(relay["protocol"], relay["hostname"], relay["port"])
            )
    public_relays_json[sid] = orjson.dumps(public_relays[sid])

# Generate the CSP header to send to browsers
hostname = hostname
websocket_host = websocket_host
relay_hosts = " ".join(relay_hostnames)
csp_header = ";".join(
    [
        f"default-src 'self' {hostname} *.{hostname}",
        "object-src 'none'",
        f"media-src {relay_hosts}",
        f"font-src 'self' {hostname} data: https://fonts.googleapis.com https://fonts.gstatic.com/",
        f"connect-src wss://{websocket_host}",
        f"style-src 'self' {hostname} 'unsafe-inline' https://fonts.googleapis.com",
        f"img-src 'self' {hostname} *.{hostname} https://cdn.discordapp.com",
    ]
)

# Sent to the frontend for menu display
station_list = {}
station_mounts = {}
for station_id, station in stations.items():
    station_list[station_id] = {
        "id": station_id,
        "name": station_id_friendly[station_id],
        "url": "{}{}/".format(base_site_url, station_mount_filenames[station_id]),
    }
    station_mounts[station["stream_filename"] + ".mp3"] = station_id
    station_mounts[station["stream_filename"] + ".ogg"] = station_id

station_list_json = orjson.dumps(station_list)
