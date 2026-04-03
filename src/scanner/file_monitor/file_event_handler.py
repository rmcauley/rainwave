import asyncio
from typing import Any
from concurrent.futures import TimeoutError as FutureTimeoutError


from pyinotify import ProcessEvent, IN_DELETE, IN_MOVED_FROM

from common import config, log
from common.db.cursor import get_cursor
from scanner.disable_file import disable_file
from scanner.exceptions import DeletedDirectoryException, NewDirectoryException
from scanner.is_mp3 import is_mp3
from scanner.scan_directory import scan_directory
from scanner.scan_errors import add_scan_error
from scanner.scan_file import scan_file
from scanner.should_ignore_file import should_ignore_file

DELETE_OPERATION = (IN_DELETE, IN_MOVED_FROM)


class FileEventHandler(ProcessEvent):
    _loop: asyncio.AbstractEventLoop

    def __init__(
        self,
        loop: asyncio.AbstractEventLoop,
        pevent: Any = None,
        **kargs: dict[str, Any],
    ):
        super().__init__(pevent, **kargs)
        self._loop = loop

    def process_IN_ATTRIB(self, event: Any) -> None:
        # ATTRIB events are:
        # - Some file renames (see: WinSCP)
        # - Directories when they've been touched

        # ATTRIB on directories causes full station rescans when directories are copied to the root
        # of a station.  As such, we have to ignore these.
        if event.dir:
            log.debug("scan", "Ignoring attrib event for directory %s" % event.pathname)
            return

        self._process(event)

    def process_IN_CREATE(self, event: Any) -> None:
        if event.dir:
            self._process(event)

    def process_IN_CLOSE_WRITE(self, event: Any) -> None:
        if event.dir:
            log.debug(
                "scan", "Ignoring close write event for directory %s" % event.pathname
            )
            return
        self._process(event)

    def process_IN_DELETE(self, event: Any) -> None:
        # Ignore WinSCP events.
        if event.pathname.endswith(".filepart"):
            return

        # Deletes are performed on files first, rendering a directory scan pointless.
        if event.dir:
            raise DeletedDirectoryException

        if not is_mp3(event.pathname):
            log.debug("scan", "Ignoring delete event for non-MP3 %s" % event.pathname)
            return

        self._process(event)

    def process_IN_MOVED_TO(self, event: Any) -> None:
        self._process(event)

        if event.dir:
            raise NewDirectoryException

    def process_IN_MOVED_FROM(self, event: Any) -> None:
        if not event.dir and not is_mp3(event.pathname):
            log.debug(
                "scan", "Ignoring moved-from event for non-MP3 %s" % event.pathname
            )
            return

        self._process(event)

    def process_IN_MOVED_SELF(self, event: Any) -> None:
        raise DeletedDirectoryException

    def _process(self, event: Any) -> None:
        coroutine = asyncio.run_coroutine_threadsafe(
            self._process_async(event), self._loop
        )
        try:
            coroutine.result()
        except FutureTimeoutError:
            coroutine.cancel()
            raise

    async def _process_async(self, event: Any) -> None:
        if should_ignore_file(event.pathname):
            return

        async with get_cursor() as cursor:
            matched_sids: list[int] = []
            try:
                for song_dirs_path, sids in config.song_dirs.items():
                    if event.pathname.startswith(song_dirs_path):
                        matched_sids.extend(sids)
            except Exception as xception:
                await add_scan_error(event.pathname, xception)

            log.debug(
                "scan", "%s %s %s" % (event.maskname, event.pathname, matched_sids)
            )

            try:
                if event.dir:
                    await scan_directory(cursor, event.pathname, matched_sids)
                elif len(matched_sids) == 0 or event.mask in DELETE_OPERATION:
                    await disable_file(cursor, event.pathname)
                else:
                    await scan_file(cursor, event.pathname, matched_sids)
            except Exception as xception:
                await add_scan_error(event.pathname, xception)
