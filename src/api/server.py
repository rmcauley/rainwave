import asyncio
from datetime import timedelta
import os
import resource

import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process

from api.handle_url import request_classes
from api.handler_classes.html404 import HTMLError404Handler
from api.handler_classes.json404 import Error404Handler
from api.helpers.cached_all_artists import update_all_artists_cache
from api.helpers.cached_all_groups import update_all_groups_cache
from common import config, log
from common.cache.cache import cache_connect
from common.db.connection import db_connect
from common.playlist.object_counts import update_playlist_object_counts

app: tornado.web.Application | None = None


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

    async def _listen(
        self, task_id: int, per_port_logging: bool, enable_periodic_jobs: bool
    ) -> None:
        global app

        # task_ids start at zero, so we gobble up ports starting at the base port and work up
        port_no = int(config.api_base_port) + task_id

        if per_port_logging:
            # Log according to configured directory and port # we're operating on.
            # Otherwise, the logging that has already been initialized will be used.
            log_file = f"logs/rw_api{port_no}.log"
            log.init(log_file, config.log_level)
            log.debug("start", "Server booting, port %s." % port_no)

        async with db_connect(auto_retry=True), cache_connect():
            app = self._build_application()
            http_server = tornado.httpserver.HTTPServer(app, xheaders=True)
            http_server.listen(port_no)

            if enable_periodic_jobs:
                self._start_periodic_jobs()

            for request in request_classes:
                log.debug("start", "   Handler: %s" % str(request))
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
            await update_playlist_object_counts()
            await update_all_artists_cache()
            await update_all_groups_cache()

    def start(
        self, per_port_logging: bool, api_num_processes: int, enable_periodic_jobs: bool
    ) -> None:
        # Bypass Tornado's forking processes if num_processes is set to 1
        if api_num_processes == 1:
            asyncio.run(self._listen(0, per_port_logging, enable_periodic_jobs))
        else:
            # The way this works, is that the parent PID is hijacked away from us and everything after this
            # is a child process.  As of Tornado 6.3, fork() is used, which means we do have a complete
            # copy of all execution in memory up until this point and we will have complete separation of
            # processes from here on out.  Tornado handles child cleanup and zombification.
            tornado.process.fork_processes(api_num_processes)

            task_id = tornado.process.task_id()
            if task_id != None:
                asyncio.run(
                    self._listen(task_id, per_port_logging, enable_periodic_jobs)
                )
