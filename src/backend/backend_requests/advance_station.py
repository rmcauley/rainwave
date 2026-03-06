from typing import cast

import tornado.web

from api import fieldtypes
from common.cache.station_cache import cache_get_station
from common.db.cursor import get_cursor
from common.schedule.advance_timeline import advance_timeline, get_next_timeline_song
from common.schedule.timeline import load_timeline
from common.schedule.timeline_types import TimelineOnStation


class AdvanceScheduleRequest(tornado.web.RequestHandler):
    async def get(self, url_sid: str) -> None:
        sid = fieldtypes.sid(url_sid)
        if not sid:
            raise tornado.web.HTTPError(
                status_code=400, log_message="Invalid station ID."
            )

        async with get_cursor() as cursor:
            timeline = cast(
                TimelineOnStation | None, await cache_get_station(sid, "timeline")
            ) or await load_timeline(cursor, sid)
            next_song = await get_next_timeline_song(cursor, sid, timeline)

            self.write(
                f'annotate:crossfade="1",replay_gain="{next_song.data['song_replay_gain']}":{next_song.filename}'
            )

        async def _advance_timeline() -> None:
            async with get_cursor() as timeline_cursor:
                await advance_timeline(timeline_cursor, sid, timeline)

        tornado.ioloop.IOLoop.current().add_callback(_advance_timeline)
