import asyncio
import importlib
import sys
from argparse import Namespace
from contextlib import asynccontextmanager
from enum import IntEnum
from types import ModuleType
from typing import Any
from unittest.mock import AsyncMock, patch

import rw_backend
from common import config


def _install_watchfiles_stub() -> None:
    watchfiles: Any = ModuleType("watchfiles")

    class Change(IntEnum):
        added = 1
        modified = 2
        deleted = 3

    async def awatch(*args: object, **kwargs: object):
        if False:
            yield set()

    watchfiles.Change = Change
    watchfiles.awatch = awatch
    sys.modules["watchfiles"] = watchfiles


def _import_rw_scanner():
    _install_watchfiles_stub()
    sys.modules.pop("rw_scanner", None)
    return importlib.import_module("rw_scanner")


@asynccontextmanager
async def _noop_async_context():
    yield None


def test_rw_backend_main_default_mode() -> None:
    with (
        patch(
            "argparse.ArgumentParser.parse_args", return_value=Namespace(testmode=False)
        ),
        patch("rw_backend.load_dotenv") as load_dotenv,
        patch("common.log.init") as log_init,
        patch("rw_backend.BackendServer.start") as backend_start,
    ):
        rw_backend.main()

    load_dotenv.assert_not_called()
    log_init.assert_called_once()
    backend_start.assert_called_once_with(
        per_station_logging=True,
        station_id_list=list(config.stations.keys()),
        enable_periodic_jobs=True,
    )


def test_rw_backend_main_testmode() -> None:
    with (
        patch(
            "argparse.ArgumentParser.parse_args", return_value=Namespace(testmode=True)
        ),
        patch("rw_backend.load_dotenv") as load_dotenv,
        patch("common.log.init") as log_init,
        patch("rw_backend.BackendServer.start") as backend_start,
    ):
        rw_backend.main()

    load_dotenv.assert_called_once()
    log_init.assert_called_once()
    backend_start.assert_called_once_with(
        per_station_logging=False,
        station_id_list=[config.default_station],
        enable_periodic_jobs=False,
    )


def test_rw_scanner_main_art_mode() -> None:
    rw_scanner = _import_rw_scanner()
    with (
        patch(
            "argparse.ArgumentParser.parse_args",
            return_value=Namespace(art=True, full=False, reset=False),
        ),
        patch("common.log.init") as log_init,
        patch("rw_scanner.db_connect", side_effect=_noop_async_context),
        patch("rw_scanner.cache.cache_connect", side_effect=_noop_async_context),
        patch("rw_scanner.full_art_update", new=AsyncMock()) as full_art_update,
        patch("rw_scanner.full_scan", new=AsyncMock()) as full_scan,
        patch("rw_scanner.file_monitor", new=AsyncMock()) as file_monitor,
    ):
        asyncio.run(rw_scanner.main())

    log_init.assert_called_once_with(None, "debug")
    full_art_update.assert_awaited_once()
    full_scan.assert_not_called()
    file_monitor.assert_not_called()


def test_rw_scanner_main_full_reset_mode() -> None:
    rw_scanner = _import_rw_scanner()
    with (
        patch(
            "argparse.ArgumentParser.parse_args",
            return_value=Namespace(art=False, full=True, reset=True),
        ),
        patch("common.log.init") as log_init,
        patch("rw_scanner.db_connect", side_effect=_noop_async_context),
        patch("rw_scanner.cache.cache_connect", side_effect=_noop_async_context),
        patch("rw_scanner.full_art_update", new=AsyncMock()) as full_art_update,
        patch("rw_scanner.full_scan", new=AsyncMock()) as full_scan,
        patch("rw_scanner.file_monitor", new=AsyncMock()) as file_monitor,
    ):
        asyncio.run(rw_scanner.main())

    log_init.assert_called_once_with(None, "debug")
    full_art_update.assert_not_called()
    full_scan.assert_awaited_once_with(True)
    file_monitor.assert_not_called()


def test_rw_scanner_main_monitor_mode() -> None:
    rw_scanner = _import_rw_scanner()
    with (
        patch(
            "argparse.ArgumentParser.parse_args",
            return_value=Namespace(art=False, full=False, reset=False),
        ),
        patch("common.log.init") as log_init,
        patch("rw_scanner.db_connect", side_effect=_noop_async_context),
        patch("rw_scanner.cache.cache_connect", side_effect=_noop_async_context),
        patch("rw_scanner.full_art_update", new=AsyncMock()) as full_art_update,
        patch("rw_scanner.full_scan", new=AsyncMock()) as full_scan,
        patch("rw_scanner.file_monitor", new=AsyncMock()) as file_monitor,
    ):
        asyncio.run(rw_scanner.main())

    log_init.assert_called_once()
    full_art_update.assert_not_called()
    full_scan.assert_not_called()
    file_monitor.assert_awaited_once()
