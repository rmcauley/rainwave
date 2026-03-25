import asyncio
from datetime import timedelta
import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process

from backend.backend_requests.advance_station import AdvanceScheduleRequest
from backend.periodic_callbacks.api_key_pruning import api_key_pruning
from backend.periodic_callbacks.mark_users_radio_inactive import (
    mark_users_radio_inactive,
)
from backend.periodic_callbacks.periodic_cooldown_algo_updating import (
    get_periodic_cooldown_algo_updating_function,
)
from common import config, log, stations
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.cooldown_config import prepare_cooldown_algorithm
from common.zeromq import zeromq


class BackendServer:
    def start(self) -> None:
        station_id_list = list(stations.station_ids)
        tornado.process.fork_processes(len(station_id_list))

        task_id = tornado.process.task_id()

        if task_id == 0:
            zeromq.init_proxy()

            key_pruning = tornado.ioloop.PeriodicCallback(
                api_key_pruning, timedelta(hours=6)
            )
            key_pruning.start()

            user_inactive_marking = tornado.ioloop.PeriodicCallback(
                mark_users_radio_inactive, timedelta(hours=6)
            )
            user_inactive_marking.start()

        if task_id != None:
            asyncio.run(self._listen(station_id_list[task_id]))

    async def _listen(self, sid: int) -> None:
        async with db_connect(auto_retry=True), cache_connect():
            log.init(
                "%s/rw_%s.log"
                % (
                    config.log_dir,
                    stations.station_id_friendly[sid].lower(),
                ),
                config.log_level,
            )

            app = tornado.web.Application(
                [
                    (r"/advance/([0-9]+)", AdvanceScheduleRequest),
                ],
                debug=config.developer_mode,
            )

            port = int(config.backend_port) + sid
            server = tornado.httpserver.HTTPServer(app)
            server.listen(port, address="127.0.0.1")

            async with get_cursor() as cursor:
                await prepare_cooldown_algorithm(cursor, sid)

            cooldown_algo_updating = tornado.ioloop.PeriodicCallback(
                get_periodic_cooldown_algo_updating_function(sid),
                timedelta(hours=1),
            )
            cooldown_algo_updating.start()

            log.debug(
                "start",
                "Backend server started, station %s port %s, ready to go."
                % (stations.station_id_friendly[sid], port),
            )

            ioloop = tornado.ioloop.IOLoop.instance()

            try:
                await asyncio.Event().wait()
            finally:
                ioloop.stop()
                server.stop()
                log.info("stop", "Server has been shutdown.")
