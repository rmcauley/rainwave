import asyncio

import pyinotify

from common import config, log
from scanner.exceptions import DeletedDirectoryException, NewDirectoryException
from scanner.file_monitor.file_event_handler import FileEventHandler


async def file_monitor() -> None:
    mask = (
        pyinotify.IN_ATTRIB
        | pyinotify.IN_CREATE
        | pyinotify.IN_CLOSE_WRITE
        | pyinotify.IN_DELETE
        | pyinotify.IN_MOVED_TO
        | pyinotify.IN_MOVED_FROM
        | pyinotify.IN_MOVE_SELF
        | pyinotify.IN_EXCL_UNLINK
    )

    go = True
    wm: pyinotify.WatchManager | None = None
    while go:
        try:
            log.info("scan", "File monitor started.")
            wm = pyinotify.WatchManager()
            wm.add_watch(config.monitor_dir, mask, rec=True, auto_add=True)
            pyinotify.Notifier(wm, FileEventHandler(asyncio.get_running_loop())).loop()
            go = False
        except NewDirectoryException:
            log.debug("scan", "New directory added, restarting watch.")
        except DeletedDirectoryException:
            log.debug("scan", "Directory was deleted, restarting watch.")
        finally:
            try:
                if wm:
                    wm.close()
            except:
                pass
            log.info("scan", "File monitor shutdown.")
