import asyncio
from datetime import timedelta
import os
import resource

import tornado.httpserver
import tornado.ioloop
import tornado.web

from api.handle_url import request_classes
from api.handler_classes.html404 import HTMLError404Handler
from api.handler_classes.json404 import Error404Handler
from api.helpers.cached_all_artists import update_all_artists_cache
from api.helpers.cached_all_groups import update_all_groups_cache
from api.websocket.websocket_zmq_listener import setup_websocket_zmq
from common import config, log, stations
from common.cache.cache import cache_connect
from common.cache.timeline_cache import (
    get_station_timeline_from_cache,
    update_timeline_api_cache,
)
from common.db.connection import db_connect
from common.db.cursor import get_cursor
from common.playlist.object_counts import update_playlist_object_counts
from common.processes.supervisor import ProcessSpec, run_forked_processes
from common.schedule.advance_timeline import get_timeline

app: tornado.web.Application | None = None


def _run_api_child(
    task_id: int, *, per_port_logging: bool, enable_periodic_jobs: bool
) -> None:
    asyncio.run(
        APIServer().listen(
            task_id,
            per_port_logging=per_port_logging,
            enable_periodic_jobs=enable_periodic_jobs,
        )
    )


class APIServer:
    def _build_application(self) -> tornado.web.Application:
        return tornado.web.Application(
            request_classes
            + [
                # Make sure all other errors get handled in an API-friendly way
                (r"/api/.*", Error404Handler),
                (r"/api4/.*", Error404Handler),
                (r".*", HTMLError404Handler),
            ],
            debug=config.developer_mode,
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(
                os.path.dirname(__file__), "..", "..", "src_frontend", "static"
            ),
            autoreload=config.developer_mode,
            serve_traceback=config.developer_mode,
        )

    def _start_periodic_jobs(self) -> None:
        update_playlist_object_counts_job = tornado.ioloop.PeriodicCallback(
            update_playlist_object_counts,
            timedelta(hours=1),
        )
        update_playlist_object_counts_job.start()

        update_all_artists_cache_job = tornado.ioloop.PeriodicCallback(
            update_all_artists_cache,
            timedelta(days=1),
        )
        update_all_artists_cache_job.start()

        update_all_groups_cache_job = tornado.ioloop.PeriodicCallback(
            update_all_groups_cache,
            timedelta(days=1),
        )
        update_all_groups_cache_job.start()

    async def listen(
        self, task_id: int, per_port_logging: bool, enable_periodic_jobs: bool
    ) -> None:
        global app

        # task_ids start at zero, so we gobble up ports starting at the base port and work up
        port_no = int(config.api_base_port) + task_id

        if per_port_logging:
            # Log according to configured directory and port # we're operating on.
            # Otherwise, the logging that has already been initialized will be used.
            log_file = f"rw_api{port_no}.log"
            log.init(
                log_file,
                log_file_level=config.log_file_level,
                log_stdout_level=config.log_stdout_level,
            )
            log.debug("start", "Server booting, port %s." % port_no)

        async with db_connect(auto_retry=True), cache_connect():
            setup_websocket_zmq()
            app = self._build_application()
            http_server = tornado.httpserver.HTTPServer(app, xheaders=True)
            http_server.listen(port_no)

            if enable_periodic_jobs:
                self._start_periodic_jobs()

            log.info("start", "Max open files: %s" % resource.RLIMIT_NOFILE)
            log.info("start", "API server on port %s ready to go." % port_no)

            ioloop = tornado.ioloop.IOLoop.instance()

            try:
                await asyncio.Event().wait()
            finally:
                ioloop.stop()
                http_server.stop()
                log.info("stop", "Server has been shutdown.")

    async def warmup(self):
        async with db_connect(auto_retry=False), cache_connect():
            await asyncio.gather(
                update_playlist_object_counts(),
                update_all_artists_cache(),
                update_all_groups_cache(),
            )

            async with get_cursor() as cursor:
                for sid in stations.station_ids:
                    timeline_from_cache_check = await get_station_timeline_from_cache(
                        sid
                    )
                    if timeline_from_cache_check:
                        continue

                    try:
                        log.info(
                            "warmup",
                            f"Station {sid} missing cached timeline, backfilling.",
                        )
                        timeline = await get_timeline(cursor, sid)
                        await update_timeline_api_cache(cursor, sid, timeline, [])
                    except Exception as e:
                        log.exception(
                            "warmup",
                            f"Failed to warm timeline API cache for station {sid}.",
                            e,
                        )

    def start(
        self, per_port_logging: bool, api_num_processes: int, enable_periodic_jobs: bool
    ) -> None:
        run_forked_processes(
            [
                ProcessSpec(
                    name=f"rainwave-api-{task_id}",
                    target=_run_api_child,
                    kwargs={
                        "task_id": task_id,
                        "per_port_logging": per_port_logging,
                        "enable_periodic_jobs": enable_periodic_jobs,
                    },
                )
                for task_id in range(api_num_processes)
            ]
        )
