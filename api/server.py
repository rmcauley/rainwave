import os
import resource

import sentry_sdk
from sentry_sdk.integrations.tornado import TornadoIntegration

import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process
import tornado.websocket

import api.web
import api.help
import api.locale
from libs import log
from libs import config
from libs import db
from libs import cache
from libs import memory_trace
from libs import buildtools
from libs import zeromq
from rainwave import playlist
from rainwave import schedule
import rainwave.request

from .urls import request_classes
from .exceptions import APIException
from api_requests.auth.errors import OAuthNetworkError, OAuthRejectedError

app = None


def sentry_before_send(event, hint):
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
    def __init__(self):
        self.ioloop = None

    def _listen(self, task_id):
        zeromq.init_pub()
        zeromq.init_sub()

        import api_requests.sync

        api_requests.sync.init()

        # task_ids start at zero, so we gobble up ports starting at the base port and work up
        port_no = int(config.get("api_base_port")) + task_id

        # Log according to configured directory and port # we're operating on
        log_file = "%s/rw_api_%s.log" % (config.get_directory("log_dir"), port_no)
        log.init(log_file, config.get("log_level"))
        log.debug("start", "Server booting, port %s." % port_no)
        db.connect(auto_retry=False, retry_only_this_time=True)
        cache.connect()
        memory_trace.setup(port_no)

        if config.has("sentry_dsn") and config.get("sentry_dsn"):
            sentry_sdk.init(
                dsn=config.get("sentry_dsn"),
                integrations=[TornadoIntegration()],
                before_send=sentry_before_send,
            )

        if config.get("developer_mode"):
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
        if not config.get("developer_mode"):
            i = 0
            while i < len(request_classes):
                if request_classes[i][0].find("/test/") != -1:
                    request_classes.pop(i)
                    i = i - 1
                i = i + 1

        # Make sure all other errors get handled in an API-friendly way
        request_classes.append((r"/api/.*", api.web.Error404Handler))
        request_classes.append((r"/api4/.*", api.web.Error404Handler))
        request_classes.append((r".*", api.web.HTMLError404Handler))

        # Initialize the help (rather than it scan all URL handlers every time someone hits it)
        api.help.sectionize_requests()

        # Fire ze missiles!
        global app
        debug = config.get("developer_mode")
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

    def start(self):
        api.locale.load_translations()
        api.locale.compile_static_language_files()

        buildtools.bake_css()
        buildtools.bake_js()
        buildtools.bake_templates()
        buildtools.bake_beta_templates()
        buildtools.copy_woff()
        buildtools.build_new_static()

        # Setup variables for the long poll module
        # Bypass Tornado's forking processes if num_processes is set to 1
        if config.get("api_num_processes") == 1:
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
            tornado.process.fork_processes(config.get("api_num_processes"))

            task_id = tornado.process.task_id()
            if task_id != None:
                self._listen(task_id)
