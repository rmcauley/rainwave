import asyncio
import aiohttp
from xml.etree import ElementTree
from typing import Any

from libs import cache
from common import config
from libs import log
from common.libs import db


class IcecastSyncCall:
    def __init__(
        self, relay_name: str, relay_info: dict[str, Any], ftype: str, sid: int
    ) -> None:
        self.relay_name = relay_name
        self.relay_info = relay_info
        self.sid = sid
        self.ftype = ftype
        self.response: bytes | None = None

    def get_listeners(self) -> list[Any] | int:
        if not self.response:
            return 0
        listeners = []
        sources = ElementTree.fromstring(self.response).find("source")
        if sources:
            for listener in sources.iter("listener"):
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

    async def request(self, client: aiohttp.ClientSession, url: str) -> None:
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


async def _start() -> None:
    loop = asyncio.get_running_loop()

    stream_names = {}
    for sid in config.station_ids:
        stream_names[sid] = config.get_station(sid, "stream_filename")

    calls = []
    requests = []
    clients = []
    for relay, relay_info in config.relays.items():
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
        for relay, _relay_info in config.relays.items():
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
            await cursor.update(
                "INSERT INTO r4_listener_counts (sid, lc_guests) VALUES (%s, %s)",
                (sid, listener_count),
            )

        for relay, count in relays.items():
            log.debug("icecast_sync", "%s total listeners: %s" % (relay, count))

        cache.set_global("relay_status", relays)

        # await cursor.update("DELETE FROM r4_listener_counts WHERE lc_time <= %s", (current_time - config.trim_history_length,))
    except Exception as e:
        log.exception("icecast_sync", "Could not finish counting listeners.", e)


def start() -> None:
    loop = asyncio.get_event_loop()
    loop.run_until_complete(_start())
