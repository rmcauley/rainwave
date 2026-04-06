from common import config, stations
from common.config_types import PublicRelayConfig

public_relays: dict[int, list[PublicRelayConfig]] = {}

# Used to generate CSP security headers for browsers
relay_hostnames: set[str] = set()
relay_hostnames.add(config.round_robin_relay_protocol + config.round_robin_relay_host)

for sid in stations.station_ids:
    public_relays[sid] = []
    for relay_name, relay in config.relays.items():
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
