import tornado.web

from api import fieldtypes
from common import log
from common.db.cursor import get_tx_cursor
from common.schedule.advance_timeline import (
    advance_timeline,
    format_song_for_liquidsoap,
    process_timeline_advance,
)


class AdvanceScheduleRequest(tornado.web.RequestHandler):
    async def get(self, url_sid: str) -> None:
        sid = fieldtypes.sid(url_sid)
        if not sid:
            raise tornado.web.HTTPError(
                status_code=400, log_message="Invalid station ID."
            )

        async with get_tx_cursor() as cursor:
            next_song = await advance_timeline(cursor, sid)

        self.write(format_song_for_liquidsoap(next_song))
        await self.flush()
        self.finish()

        try:
            async with get_tx_cursor() as cursor:
                await process_timeline_advance(cursor, sid)
        except Exception as e:
            log.exception("advance", "Post-process failed after song handoff.", e)
