import asyncio
import os
import resource

import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process

from api.handler_classes.html404 import HTMLError404Handler
from api.handler_classes.json404 import Error404Handler
from common import config, log, zeromq
from common.cache.cache import cache_connect
from common.db.connection import db_close, db_connect
import common.locale.locale
from api.handle_url import request_classes

app: tornado.web.Application | None = None


class APIServer:
    def __init__(self) -> None:
        super().__init__()
        self.ioloop: tornado.ioloop.IOLoop | None = None

    async def _listen(self, task_id: int) -> None:
        global app

        zeromq.init_pub()
        zeromq.init_sub()

        import api.routes.sync

        api.routes.sync.init()

        # task_ids start at zero, so we gobble up ports starting at the base port and work up
        port_no = int(config.api_base_port) + task_id

        # Log according to configured directory and port # we're operating on
        log_file = f"logs/rw_api_%{port_no}.log"
        log.init(log_file, config.log_level)
        log.debug("start", "Server booting, port %s." % port_no)
        await db_connect(auto_retry=False, retry_only_this_time=True)
        await cache_connect()

        # Make sure all other errors get handled in an API-friendly way
        request_classes.append((r"/api/.*", Error404Handler))
        request_classes.append((r"/api4/.*", Error404Handler))
        request_classes.append((r".*", HTMLError404Handler))

        app = tornado.web.Application(
            request_classes,
            debug=config.developer_mode,
            template_path=os.path.join(os.path.dirname(__file__), "templates"),
            static_path=os.path.join(
                os.path.dirname(__file__), "..", "..", "src_frontend", "static"
            ),
            autoreload=config.developer_mode,
            serve_traceback=config.developer_mode,
        )
        http_server = tornado.httpserver.HTTPServer(app, xheaders=True)
        http_server.listen(port_no)

        for request in request_classes:
            log.debug("start", "   Handler: %s" % str(request))
        log.info("start", "Max open files: %s" % resource.RLIMIT_NOFILE)
        log.info("start", "API server on port %s ready to go." % port_no)
        self.ioloop = tornado.ioloop.IOLoop.instance()

        try:
            await asyncio.Event().wait()
        finally:
            self.ioloop.stop()
            http_server.stop()
            await db_close()
            log.info("stop", "Server has been shutdown.")

    def start(self) -> None:
        common.locale.locale.load_translations()

        # Setup variables for the long poll module
        # Bypass Tornado's forking processes if num_processes is set to 1
        if config.api_num_processes == 1:
            asyncio.run(self._listen(0))
        else:
            # The way this works, is that the parent PID is hijacked away from us and everything after this
            # is a child process.  As of Tornado 6.3, fork() is used, which means we do have a complete
            # copy of all execution in memory up until this point and we will have complete separation of
            # processes from here on out.  Tornado handles child cleanup and zombification.
            tornado.process.fork_processes(config.api_num_processes)

            task_id = tornado.process.task_id()
            if task_id != None:
                asyncio.run(self._listen(task_id))
