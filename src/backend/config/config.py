import orjson
from config import rainwave_config
from src_backend.config.config_types import PublicRelayConfig

station_ids: set[int] = set(k for k in rainwave_config.stations.keys())
station_id_friendly: dict[int, str] = {
    sid: v["name"] for (sid, v) in rainwave_config.stations.items()
}

station_mount_filenames = {
    sid: v["stream_filename"] for (sid, v) in rainwave_config.stations.items()
}
stream_filename_to_sid: dict[str, int] = {
    v["stream_filename"]: sid for (sid, v) in rainwave_config.stations.items()
}
csp_header = ""

# Used to generate URLs for listeners to tune in to
public_relays: dict[int, list[PublicRelayConfig]] = {}
# Used for pre-dumped object to stuff into requests
public_relays_json = {}

# Used to generate CSP security headers for browsers
relay_hostnames: set[str] = set()
relay_hostnames.add(
    rainwave_config.round_robin_relay_protocol + rainwave_config.round_robin_relay_host
)

for sid in station_ids:
    public_relays[sid] = []
    for relay_name, relay in rainwave_config.relays.items():
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
hostname = rainwave_config.hostname
websocket_host = rainwave_config.websocket_host
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
for station_id, station in rainwave_config.stations.items():
    station_list[station_id] = {
        "id": station_id,
        "name": station_id_friendly[station_id],
        "url": "{}{}/".format(
            rainwave_config.base_site_url, station_mount_filenames[station_id]
        ),
    }
    station_mounts[station["stream_filename"] + ".mp3"] = station_id
    station_mounts[station["stream_filename"] + ".ogg"] = station_id

station_list_json = orjson.dumps(station_list)
