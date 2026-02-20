import asyncio
import aiohttp
import requests
from common import config, log
from common.schedule.timeline import TimelineOnStation

_background_tasks: set[asyncio.Task[None]] = set()


async def _send_tunein_update(url: str) -> None:
    try:
        timeout = aiohttp.ClientTimeout(total=3)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.get(url) as resp:
                body = await resp.text()
                log.debug("advance", "TuneIn updated (%s): %s" % (resp.status, body))
    except Exception as e:
        log.exception("advance", "Could not update TuneIn.", e)


def update_tunein(sid: int, timeline: TimelineOnStation) -> None:
    tunein_partner_key = config.stations[sid].get("tunein_partner_key")
    tunein_partner_id = config.stations[sid].get("tunein_partner_id")
    tunein_id = config.stations[sid].get("tunein_id")
    if tunein_partner_key and tunein_partner_id and tunein_id:
        ti_song = timeline.current.get_song_on_station_to_play()
        ti_title = ti_song.data["song_title"]
        ti_album = ti_song.data["album_name"]
        ti_artist = ", ".join([a["name"] for a in ti_song.get_artists_from_parseable()])

        params = {
            "id": tunein_id,
            "title": ti_title,
            "artist": ti_artist,
            "album": ti_album,
        }

        req = requests.Request(
            "GET", "http://air.radiotime.com/Playing.ashx", params=params
        )
        p = req.prepare()
        p.url = p.url or ""
        # Must be done here rather than in Request() params because of odd strings TuneIn creates
        p.url += f"&partnerId={tunein_partner_id}"
        p.url += f"&partnerKey={tunein_partner_key}"

        task = asyncio.create_task(_send_tunein_update(p.url))
        _background_tasks.add(task)
        task.add_done_callback(_background_tasks.discard)
