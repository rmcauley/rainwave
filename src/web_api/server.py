import os
import resource

import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process
import tornado.websocket
from typing import Any

import web_api.web
import src.web_api.routes.help
import backend.locale.locale
from libs import log
from src.backend.config import config
from src.backend.libs import db
from libs import cache
from libs import memory_trace
from libs import zeromq
from src.backend.rainwave import playlist
from src.backend.rainwave import schedule
import rainwave.request

from routes.index import request_classes
from .exceptions import APIException
from routes.auth.errors import OAuthNetworkError, OAuthRejectedError

app = None


def sentry_before_send(
    event: dict[str, Any], hint: dict[str, Any]
) -> dict[str, Any] | None:
    if "exc_info" in hint:
        exc_type, exc_value, tb = hint["exc_info"]
        if isinstance(exc_value, APIException) and exc_value.code != 500:
            return None
        if isinstance(exc_value, tornado.websocket.WebSocketClosedError):
            return None
        if isinstance(exc_value, (OAuthNetworkError, OAuthRejectedError)):
            return None
    return event


class APIServer:
    def __init__(self) -> None:
        self.ioloop: tornado.ioloop.IOLoop | None = None

    def _listen(self, task_id: int) -> None:
        zeromq.init_pub()
        zeromq.init_sub()

        import routes.sync

        routes.sync.init()

        # task_ids start at zero, so we gobble up ports starting at the base port and work up
        port_no = int(config.api_base_port) + task_id

        # Log according to configured directory and port # we're operating on
        log_file = "%s/rw_api_%s.log" % (config.get_directory("log_dir"), port_no)
        log.init(log_file, config.log_level)
        log.debug("start", "Server booting, port %s." % port_no)
        db.connect(auto_retry=False, retry_only_this_time=True)
        cache.connect()
        memory_trace.setup(port_no)

        if config.developer_mode:
            for station_id in config.station_ids:
                playlist.prepare_cooldown_algorithm(station_id)
            # automatically loads every station ID and fills things in if there's no data
            schedule.load()
            for station_id in config.station_ids:
                schedule.update_memcache(station_id)
                rainwave.request.update_line(station_id)
                rainwave.request.update_expire_times()
                cache.set_station(station_id, "backend_ok", True)
                cache.set_station(station_id, "backend_message", "OK")
                cache.set_station(station_id, "get_next_socket_timeout", False)

        for sid in config.station_ids:
            cache.update_local_cache_for_sid(sid)
            playlist.prepare_cooldown_algorithm(sid)
            playlist.update_num_songs()

        # If we're not in developer, remove development-related URLs
        if not config.developer_mode:
            i = 0
            while i < len(request_classes):
                if request_classes[i][0].find("/test/") != -1:
                    request_classes.pop(i)
                    i = i - 1
                i = i + 1

        # Make sure all other errors get handled in an API-friendly way
        request_classes.append((r"/api/.*", web_api.web.Error404Handler))
        request_classes.append((r"/api4/.*", web_api.web.Error404Handler))
        request_classes.append((r".*", web_api.web.HTMLError404Handler))

        # Initialize the help (rather than it scan all URL handlers every time someone hits it)
        src.web_api.routes.help.sectionize_requests()

        # Fire ze missiles!
        global app
        debug = config.developer_mode
        app = tornado.web.Application(
            request_classes,
            debug=debug,
            template_path=os.path.join(os.path.dirname(__file__), "../templates"),
            static_path=os.path.join(os.path.dirname(__file__), "../static"),
            autoescape=None,
            autoreload=debug,
            serve_traceback=debug,
        )
        http_server = tornado.httpserver.HTTPServer(app, xheaders=True)
        http_server.listen(port_no)

        for request in request_classes:
            log.debug("start", "   Handler: %s" % str(request))
        log.info("start", "Max open files: %s" % resource.RLIMIT_NOFILE)
        log.info("start", "API server on port %s ready to go." % port_no)
        self.ioloop = tornado.ioloop.IOLoop.instance()

        db_keepalive = tornado.ioloop.PeriodicCallback(db.connection_keepalive, 10000)
        db_keepalive.start()

        try:
            self.ioloop.start()
        finally:
            self.ioloop.stop()
            http_server.stop()
            db.close()
            log.info("stop", "Server has been shutdown.")
            log.close()

    def start(self) -> None:
        backend.locale.locale.load_translations()
        backend.locale.locale.compile_static_language_files()

        # Setup variables for the long poll module
        # Bypass Tornado's forking processes if num_processes is set to 1
        if config.api_num_processes == 1:
            self._listen(0)
        else:
            # The way this works, is that the parent PID is hijacked away from us and everything after this
            # is a child process.  As of Tornado 2.1, fork() is used, which means we do have a complete
            # copy of all execution in memory up until this point and we will have complete separation of
            # processes from here on out.  Tornado handles child cleanup and zombification.
            #
            # We can have a config directive for numprocesses but it's entirely optional - a return of
            # None from the config option getter (if the config didn't exist) will cause Tornado
            # to spawn as many processes as there are cores on the server CPU(s).
            tornado.process.fork_processes(config.api_num_processes)

            task_id = tornado.process.task_id()
            if task_id != None:
                self._listen(task_id)
