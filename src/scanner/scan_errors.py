import sys
from time import time as timestamp
import traceback
from typing import Any, TypedDict

from common import log
from common.cache.cache import cache_get, cache_set
from scanner.exceptions import NonFatalScannerError


class ScanError(TypedDict):
    time: int
    file: str
    type: str
    error: str
    traceback: str


async def add_scan_error(
    filename: str,
    xception: Exception,
    full_exc: Any | None = None,
) -> None:
    scan_errors: list[ScanError] = []
    try:
        scan_errors = await cache_get("backend_scan_errors")
    except:
        pass

    scan_error: ScanError = {
        "time": int(timestamp()),
        "file": filename,
        "type": xception.__class__.__name__,
        "error": str(xception),
        "traceback": "",
    }
    if (
        not isinstance(xception, NonFatalScannerError)
        and not isinstance(xception, IOError)
        and not isinstance(xception, OSError)
    ):
        if full_exc:
            scan_error["traceback"] = "\n".join(traceback.format_exception(*full_exc))
            log.exception("scan", "Error scanning %s" % filename, full_exc)
        else:
            scan_error["traceback"] = "\n".join(
                traceback.format_exception(*sys.exc_info())
            )
            log.exception("scan", "Error scanning %s" % filename, sys.exc_info())
    else:
        log.warn("scan", "Warning scanning %s: %s" % (filename, xception))
    scan_errors.insert(0, scan_error)
    if len(scan_errors) > 100:
        scan_errors = scan_errors[0:100]
    await cache_set("backend_scan_errors", scan_errors)
