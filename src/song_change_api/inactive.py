import tornado.ioloop
from time import time as timestamp
from backend.libs import db
import tempfile
import os


def inactive_checking() -> None:
    last_time = 0
    if os.path.isfile("%s/r4_inactive_check" % tempfile.gettempdir()):
        f = open("%s/r4_inactive_check" % tempfile.gettempdir())
        t = f.read()
        f.close()
        try:
            last_time = int(t)
        except Exception:
            pass
    if (not last_time) or (last_time < (timestamp() - 86400)):
        _update_inactive()


def _update_inactive() -> None:
    f = open("%s/r4_inactive_check" % tempfile.gettempdir(), "w")
    f.write(str(int(timestamp())))
    f.close()
    time_threshold = timestamp() - (86400 * 30)
    db.c.update(
        """
        UPDATE phpbb_users
        SET radio_inactive = TRUE
        WHERE radio_inactive = FALSE
            AND radio_last_active < %s
""",
        (time_threshold,),
    )


checking = tornado.ioloop.PeriodicCallback(inactive_checking, 360000)
checking.start()
