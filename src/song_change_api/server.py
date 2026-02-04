from time import time as timestamp
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process
import tornado.options
from typing import Any

from song_change_api import sync_to_front
from src.backend.rainwave import schedule
from src.backend.rainwave import playlist
from libs import log
from src.backend import config
from src.backend.libs import db
from libs import cache
from libs import memory_trace
from libs import zeromq


class AdvanceScheduleRequest(tornado.web.RequestHandler):
    processed = False
    success = False
    sid = None

    def get(self, sid: str) -> None:
        self.success = False
        self.sid = None
        if int(sid) in config.station_ids:
            self.sid = int(sid)
        else:
            return

        try:
            schedule.advance_station(self.sid)
        except db.transaction_rollback_errors:
            log.warn(
                "backend",
                "Database transaction deadlock.  Re-opening database and setting retry timeout.",
            )
            db.close()
            db.connect()
            raise

        to_send = None
        if not config.liquidsoap_annotations:
            to_send = schedule.get_advancing_file(self.sid)
        else:
            to_send = self._get_annotated(schedule.get_advancing_event(self.sid))
        self.success = True
        if not cache.get_station(self.sid, "get_next_socket_timeout"):
            self.write(to_send)

    def _get_annotated(self, e: Any) -> str:
        string = 'annotate:crossfade="'
        if e.use_crossfade == True:
            string += "1"
        elif e.use_crossfade:
            string += e.use_crossfade
        else:
            string += "0"
        string += '",'

        string += 'use_suffix="'
        if e.use_tag_suffix:
            string += "1"
        else:
            string += "0"
        string += '"'

        if hasattr(e, "songs"):
            string += ',suffix="%s"' % config.get_station(self.sid, "stream_suffix")
        elif e.name:
            string += ',title="%s"' % e.name

        if hasattr(e, "replay_gain") and e.replay_gain:
            string += ',replay_gain="%s"' % e.replay_gain

        string += ":" + e.get_filename()
        return string


class SongChangeApiServer:
    def _listen(self, sid: int) -> None:
        log.init(
            "%s/rw_%s.log"
            % (
                config.get_directory("log_dir"),
                config.station_id_friendly[sid].lower(),
            ),
            config.log_level,
        )
        db.connect()
        cache.connect()
        zeromq.init_pub()
        memory_trace.setup(config.station_id_friendly[sid].lower())

        # (r"/refresh/([0-9]+)", RefreshScheduleRequest)
        app = tornado.web.Application(
            [
                (r"/advance/([0-9]+)", AdvanceScheduleRequest),
            ],
            debug=config.developer_mode,
        )

        port = int(config.backend_port) + sid
        server = tornado.httpserver.HTTPServer(app)
        server.listen(port, address="127.0.0.1")

        for station_id in config.station_ids:
            playlist.prepare_cooldown_algorithm(station_id)
        schedule.load()
        log.debug(
            "start",
            "Backend server started, station %s port %s, ready to go."
            % (config.station_id_friendly[sid], port),
        )

        ioloop = tornado.ioloop.IOLoop.instance()
        try:
            ioloop.start()
        finally:
            ioloop.stop()
            server.stop()
            db.close()
            log.info("stop", "Backend has been shutdown.")
            log.close()

    def _import_cron_modules(self) -> None:
        # pylint: disable=import-outside-toplevel,unused-import
        # This method breaks pylint and quite on purpose, its job is to just load
        # the cron jobs that run occasionally.
        import song_change_api.api_key_pruning
        import song_change_api.inactive
        import get_next_server.dj_heartbeat

        # pylint: enable=import-outside-toplevel,unused-import

    def start(self) -> None:
        stations = list(config.station_ids)
        tornado.process.fork_processes(len(stations))

        task_id = tornado.process.task_id()
        if task_id == 0:
            zeromq.init_proxy()
            self._import_cron_modules()
        if task_id != None:
            self._listen(stations[task_id])
