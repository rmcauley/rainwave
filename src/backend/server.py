import asyncio
from datetime import timedelta
import tornado.httpserver
import tornado.ioloop
import tornado.web

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
from common.cache.station_cache import cache_set_station
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.cooldown_config import prepare_cooldown_algorithm
from common.processes.supervisor import ProcessSpec, run_forked_processes


def _run_backend_child(
    sid: int,
    *,
    per_station_logging: bool,
    enable_periodic_jobs: bool,
    enable_global_periodic_jobs: bool,
) -> None:
    asyncio.run(
        BackendServer().listen(
            sid,
            per_station_logging=per_station_logging,
            enable_periodic_jobs=enable_periodic_jobs,
            enable_global_periodic_jobs=enable_global_periodic_jobs,
        )
    )


class BackendServer:
    async def _prepare_cooldown_algorithms(self, station_id_list: list[int]) -> None:
        async with db_connect(auto_retry=True), get_cursor() as cursor:
            for sid in station_id_list:
                await prepare_cooldown_algorithm(cursor, sid)

    def start(
        self,
        *,
        per_station_logging: bool,
        station_id_list: list[int],
        enable_periodic_jobs: bool,
    ) -> None:
        asyncio.run(self._prepare_cooldown_algorithms(station_id_list))

        run_forked_processes(
            [
                ProcessSpec(
                    name=f"rainwave-backend-{sid}",
                    target=_run_backend_child,
                    kwargs={
                        "sid": sid,
                        "per_station_logging": per_station_logging,
                        "enable_periodic_jobs": enable_periodic_jobs,
                        "enable_global_periodic_jobs": (
                            enable_periodic_jobs and task_id == 0
                        ),
                    },
                )
                for task_id, sid in enumerate(station_id_list)
            ]
        )

    async def listen(
        self,
        sid: int,
        *,
        per_station_logging: bool,
        enable_periodic_jobs: bool,
        enable_global_periodic_jobs: bool,
    ) -> None:
        async with db_connect(auto_retry=True), cache_connect():
            if per_station_logging:
                log.init(
                    "rw_%s.log" % stations.station_id_friendly[sid].lower(),
                    log_file_level=config.log_file_level,
                    log_stdout_level=config.log_stdout_level,
                )

            from common.zeromq import zeromq

            zeromq.connect_publisher()

            app = tornado.web.Application(
                [
                    (r"/advance/([0-9]+)", AdvanceScheduleRequest),
                ],
                debug=config.developer_mode,
            )

            port = int(config.backend_port) + sid
            server = tornado.httpserver.HTTPServer(app)
            server.listen(port, address="127.0.0.1")

            await cache_set_station(sid, "backend_ok", True)

            if enable_periodic_jobs:
                cooldown_algo_updating = tornado.ioloop.PeriodicCallback(
                    get_periodic_cooldown_algo_updating_function(sid),
                    timedelta(hours=1),
                )
                cooldown_algo_updating.start()

            if enable_global_periodic_jobs:
                key_pruning = tornado.ioloop.PeriodicCallback(
                    api_key_pruning, timedelta(hours=6)
                )
                key_pruning.start()

                user_inactive_marking = tornado.ioloop.PeriodicCallback(
                    mark_users_radio_inactive, timedelta(hours=6)
                )
                user_inactive_marking.start()

            log.info(
                "start",
                "Backend server started, station %s port %s, ready to go."
                % (stations.station_id_friendly[sid], port),
            )

            ioloop = tornado.ioloop.IOLoop.instance()

            try:
                await asyncio.Event().wait()
            finally:
                await cache_set_station(sid, "backend_ok", False)
                ioloop.stop()
                server.stop()
                log.info("stop", "Server has been shutdown.")
