from api import rainwave_typeddicts
from common import config, stations
from common.config_types import PublicRelayConfig

public_relays: dict[int, list[PublicRelayConfig]] = {}
api_relays: dict[int, rainwave_typeddicts.Relays] = {}

# Used to generate CSP security headers for browsers
relay_hostnames: set[str] = set()

for sid in stations.station_ids:
    public_relays[sid] = []
    api_relays[sid] = []
    for relay_name, relay in config.relays.items():
        if sid in relay["sids"]:
            public_relays[sid].append(
                {
                    "name": relay_name,
                    "protocol": relay["protocol"],
                    "hostname": relay["hostname"],
                }
            )
            api_relays[sid].append(
                {
                    "hostname": relay["hostname"],
                    "name": relay_name,
                    "port": 80 if relay["protocol"] == "http://" else 443,
                    "protocol": relay["protocol"],
                }
            )
            relay_hostnames.add(relay["protocol"] + relay["hostname"])
            relay_hostnames.add("{}{}".format(relay["protocol"], relay["hostname"]))
