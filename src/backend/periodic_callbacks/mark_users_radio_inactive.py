from time import time as timestamp
from common.db.cursor import get_cursor
import tempfile
import os


async def mark_users_radio_inactive() -> None:
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
        await _update_inactive()


async def _update_inactive() -> None:
    f = open("%s/r4_inactive_check" % tempfile.gettempdir(), "w")
    f.write(str(int(timestamp())))
    f.close()
    time_threshold = timestamp() - (86400 * 30)
    async with get_cursor() as cursor:
        await cursor.update(
            """
            UPDATE phpbb_users
            SET radio_inactive = TRUE
            WHERE radio_inactive = FALSE
                AND radio_last_active < %s
    """,
            (time_threshold,),
        )
