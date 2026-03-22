import tornado.web

from api import fieldtypes
from common.schedule.advance_timeline import advance_timeline


class AdvanceScheduleRequest(tornado.web.RequestHandler):
    async def get(self, url_sid: str) -> None:
        sid = fieldtypes.sid(url_sid)
        if not sid:
            raise tornado.web.HTTPError(
                status_code=400, log_message="Invalid station ID."
            )

        self.write(await advance_timeline(sid))
