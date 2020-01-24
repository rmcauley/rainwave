from time import time as timestamp
import tornado.ioloop
from libs import cache
from libs import config
from libs import log
from api import liquidsoap


def dj_heartbeat_check():
    # Don't do this in testing environments
    if config.get("developer_mode"):
        return
    for sid in config.station_ids:
        if cache.get_station(sid, "backend_paused_playing"):
            hb = cache.get_station(sid, "dj_heartbeat")
            hbs = cache.get_station(sid, "dj_heartbeat_start")
            if not hbs or ((timestamp() - hbs) <= 10):
                pass
            elif not hb or ((timestamp() - hb) >= 15):
                log.warn(
                    "dj_heartbeat", "DJ heart attack - resetting station to normal."
                )
                cache.set_station(sid, "backend_paused", False)
                cache.set_station(sid, "backend_paused_playing", False)
                liquidsoap.kick_dj(sid)
                liquidsoap.skip(sid)


checking = tornado.ioloop.PeriodicCallback(dj_heartbeat_check, 10000)
checking.start()
