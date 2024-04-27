import asyncio
import aiohttp
from xml.etree import ElementTree

from libs import cache
from libs import config
from libs import log
from libs import db


class IcecastSyncCall:
    def __init__(self, relay_name, relay_info, ftype, sid):
        self.relay_name = relay_name
        self.relay_info = relay_info
        self.sid = sid
        self.ftype = ftype
        self.response = None

    def get_listeners(self):
        if not self.response:
            return 0
        listeners = []
        for listener in (
            ElementTree.fromstring(self.response).find("source").iter("listener")
        ):
            listeners.append(listener)
        log.debug(
            "icecast_sync",
            "%s %s %s count: %s"
            % (
                self.relay_name,
                config.station_id_friendly[self.sid],
                self.ftype,
                len(listeners),
            ),
        )
        return listeners

    async def request(self, client, url):
        async with client.get(url, ssl=False) as response:
            if response.status != 200:
                log.warn(
                    "icecast_sync",
                    "%s %s %s failed query: %s %s"
                    % (
                        self.relay_name,
                        config.station_id_friendly[self.sid],
                        self.ftype,
                        response.status,
                        response.reason,
                    ),
                )
            else:
                self.response = await response.read()


async def _start():
    loop = asyncio.get_running_loop()

    stream_names = {}
    for sid in config.station_ids:
        stream_names[sid] = config.get_station(sid, "stream_filename")

    calls = []
    requests = []
    clients = []
    for relay, relay_info in config.get("relays").items():
        client = aiohttp.ClientSession(
            loop=loop,
            timeout=aiohttp.ClientTimeout(total=5),
            auth=aiohttp.BasicAuth(
                login=relay_info["admin_username"],
                password=relay_info["admin_password"],
            ),
        )
        clients.append(client)
        relay_base_url = "%s%s:%s/admin/listclients?mount=/" % (
            relay_info["protocol"],
            relay_info["ip_address"],
            relay_info["port"],
        )
        for sid in relay_info["sids"]:
            for ftype in (".mp3", ".ogg"):
                call = IcecastSyncCall(relay, relay_info, ftype, sid)
                calls.append(call)
                requests.append(
                    call.request(
                        client=client,
                        url=relay_base_url + stream_names[sid] + ftype,
                    )
                )

    try:
        await asyncio.gather(*requests)
    finally:
        for client in clients:
            await client.close()

    log.debug("icecast_sync", "All responses came back for counting.")

    try:
        stations = {}
        for sid in config.station_ids:
            stations[sid] = 0

        relays = {}
        for relay, _relay_info in config.get("relays").items():
            relays[relay] = 0

        for call in calls:
            listeners = call.get_listeners()
            stations[call.sid] += len(listeners)
            relays[call.relay_name] += len(listeners)

        for sid, listener_count in stations.items():
            log.debug(
                "icecast_sync",
                "%s has %s listeners."
                % (config.station_id_friendly[sid], listener_count),
            )
            db.c.update(
                "INSERT INTO r4_listener_counts (sid, lc_guests) VALUES (%s, %s)",
                (sid, listener_count),
            )

        for relay, count in relays.items():
            log.debug("icecast_sync", "%s total listeners: %s" % (relay, count))

        cache.set_global("relay_status", relays)

        # db.c.update("DELETE FROM r4_listener_counts WHERE lc_time <= %s", (current_time - config.get("trim_history_length"),))
    except Exception as e:
        log.exception("icecast_sync", "Could not finish counting listeners.", e)


def start():
    loop = asyncio.get_event_loop()
    loop.run_until_complete(_start())
