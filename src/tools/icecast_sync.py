import asyncio
from typing import Any, Coroutine
import aiohttp
from xml.etree import ElementTree

from common import config, log, stations
from common.config_types import RelayConfig
from common.db.cursor import get_cursor


class IcecastSyncCall:
    def __init__(
        self,
        relay_name: str,
        relay_info: RelayConfig,
        file_extension: str,
        sid: int,
    ) -> None:
        super().__init__()
        self.relay_name = relay_name
        self.relay_info = relay_info
        self.sid = sid
        self.file_extension = file_extension
        self.response: bytes | None = None

    def get_listeners(self) -> int:
        if not self.response:
            return 0
        listener_count = 0
        sources = ElementTree.fromstring(self.response).find("source")
        if sources:
            listener_count = len(sources)
        log.debug(
            "icecast_sync",
            "%s %s %s count: %s"
            % (
                self.relay_name,
                stations.station_id_friendly[self.sid],
                self.file_extension,
                listener_count,
            ),
        )
        return listener_count

    async def request(self, client: aiohttp.ClientSession, url: str) -> None:
        async with client.get(url, ssl=False) as response:
            if response.status != 200:
                log.warn(
                    "icecast_sync",
                    "%s %s %s failed query: %s %s"
                    % (
                        self.relay_name,
                        stations.station_id_friendly[self.sid],
                        self.file_extension,
                        response.status,
                        response.reason,
                    ),
                )
            else:
                self.response = await response.read()


async def _start() -> None:
    loop = asyncio.get_running_loop()

    calls: list[IcecastSyncCall] = []
    requests: list[Coroutine[Any, Any, None]] = []
    clients: list[aiohttp.ClientSession] = []
    for relay_name, relay_info in config.relays.items():
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
            for file_extension in (".mp3", ".ogg"):
                call = IcecastSyncCall(relay_name, relay_info, file_extension, sid)
                calls.append(call)
                requests.append(
                    call.request(
                        client=client,
                        url=relay_base_url
                        + config.stations[sid]["stream_filename"]
                        + file_extension,
                    )
                )

    try:
        await asyncio.gather(*requests)
    finally:
        for client in clients:
            await client.close()

    log.debug("icecast_sync", "All responses came back for counting.")

    async with get_cursor() as cursor:
        try:
            station_listener_count: dict[int, int] = {}
            for sid in stations.station_ids:
                station_listener_count[sid] = 0

            relays: dict[str, int] = {}
            for relay_name in config.relays.keys():
                relays[relay_name] = 0

            for call in calls:
                listener_count = call.get_listeners()
                station_listener_count[call.sid] += listener_count
                relays[call.relay_name] += listener_count

            for sid, listener_count in station_listener_count.items():
                log.debug(
                    "icecast_sync",
                    "%s has %s listeners."
                    % (stations.station_id_friendly[sid], listener_count),
                )
                await cursor.update(
                    "INSERT INTO r4_listener_counts (sid, lc_guests) VALUES (%s, %s)",
                    (sid, listener_count),
                )

            for relay_name, count in relays.items():
                log.debug(
                    "icecast_sync", "%s total listeners: %s" % (relay_name, count)
                )
        except Exception as e:
            log.exception("icecast_sync", "Could not finish counting listeners.", e)
            raise


def start() -> None:
    loop = asyncio.get_event_loop()
    loop.run_until_complete(_start())
