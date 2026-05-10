# pyright: reportAttributeAccessIssue=false, reportPrivateUsage=false

import asyncio
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, Mock, patch

from backend.server import BackendServer


@asynccontextmanager
async def _noop_async_context(*args: object, **kwargs: object):
    yield None


@asynccontextmanager
async def _cursor_context(cursor: object):
    yield cursor


def test_backend_server_start_creates_forked_children() -> None:
    def _fake_asyncio_run(coroutine: object) -> None:
        if hasattr(coroutine, "close"):
            coroutine.close()

    with (
        patch("backend.server.run_forked_processes") as run_forked_processes,
        patch(
            "backend.server.asyncio.run", side_effect=_fake_asyncio_run
        ) as asyncio_run,
    ):
        BackendServer().start(
            per_station_logging=True,
            station_id_list=[1, 2],
            enable_periodic_jobs=True,
        )

    assert asyncio_run.call_count == 1
    process_specs = run_forked_processes.call_args.args[0]
    assert [spec.name for spec in process_specs] == [
        "rainwave-backend-1",
        "rainwave-backend-2",
    ]
    assert process_specs[0].kwargs == {
        "sid": 1,
        "per_station_logging": True,
        "enable_periodic_jobs": True,
        "enable_global_periodic_jobs": True,
    }
    assert process_specs[1].kwargs == {
        "sid": 2,
        "per_station_logging": True,
        "enable_periodic_jobs": True,
        "enable_global_periodic_jobs": False,
    }


def test_backend_server_prepares_cooldown_algorithms() -> None:
    cursor = AsyncMock()

    with (
        patch("backend.server.db_connect", side_effect=_noop_async_context),
        patch(
            "backend.server.get_cursor",
            side_effect=lambda: _cursor_context(cursor),
        ),
        patch(
            "backend.server.prepare_cooldown_algorithm",
            new=AsyncMock(),
        ) as prepare_cooldown_algorithm,
    ):
        asyncio.run(BackendServer()._prepare_cooldown_algorithms([1, 2]))

    assert prepare_cooldown_algorithm.await_args_list[0].args == (cursor, 1)
    assert prepare_cooldown_algorithm.await_args_list[1].args == (cursor, 2)


def test_backend_server_listen_initializes_and_shuts_down() -> None:
    server = Mock()
    ioloop = Mock()
    cooldown_callback = Mock()

    class StopEvent:
        async def wait(self) -> None:
            raise RuntimeError("stop test")

    with (
        patch("backend.server.db_connect", side_effect=_noop_async_context),
        patch("backend.server.cache_connect", side_effect=_noop_async_context),
        patch("backend.server.log.init") as log_init,
        patch(
            "backend.server.tornado.web.Application", return_value=Mock()
        ) as app_ctor,
        patch("backend.server.tornado.httpserver.HTTPServer", return_value=server),
        patch(
            "backend.server.cache_set_station",
            new=AsyncMock(),
        ) as cache_set_station,
        patch(
            "backend.server.tornado.ioloop.PeriodicCallback",
            return_value=cooldown_callback,
        ),
        patch("backend.server.tornado.ioloop.IOLoop.instance", return_value=ioloop),
        patch("backend.server.asyncio.Event", return_value=StopEvent()),
    ):
        try:
            asyncio.run(
                BackendServer().listen(
                    1,
                    per_station_logging=True,
                    enable_periodic_jobs=True,
                    enable_global_periodic_jobs=False,
                )
            )
        except RuntimeError as exc:
            assert str(exc) == "stop test"
        else:
            raise AssertionError("RuntimeError was not raised")

    log_init.assert_called_once()
    app_ctor.assert_called_once()
    server.listen.assert_called_once()
    assert cache_set_station.await_count == 2
    cooldown_callback.start.assert_called_once()
    ioloop.stop.assert_called_once()
    server.stop.assert_called_once()


def test_backend_server_listen_starts_global_periodic_jobs() -> None:
    server = Mock()
    station_callback = Mock()
    key_pruning_callback = Mock()
    inactive_marking_callback = Mock()

    class StopEvent:
        async def wait(self) -> None:
            raise RuntimeError("stop test")

    with (
        patch("backend.server.db_connect", side_effect=_noop_async_context),
        patch("backend.server.cache_connect", side_effect=_noop_async_context),
        patch("backend.server.log.init"),
        patch("backend.server.tornado.web.Application", return_value=Mock()),
        patch("backend.server.tornado.httpserver.HTTPServer", return_value=server),
        patch(
            "backend.server.cache_set_station",
            new=AsyncMock(),
        ),
        patch(
            "backend.server.tornado.ioloop.PeriodicCallback",
            side_effect=[
                station_callback,
                key_pruning_callback,
                inactive_marking_callback,
            ],
        ) as periodic_callback,
        patch("backend.server.tornado.ioloop.IOLoop.instance", return_value=Mock()),
        patch("backend.server.asyncio.Event", return_value=StopEvent()),
    ):
        try:
            asyncio.run(
                BackendServer().listen(
                    1,
                    per_station_logging=True,
                    enable_periodic_jobs=True,
                    enable_global_periodic_jobs=True,
                )
            )
        except RuntimeError:
            pass
        else:
            raise AssertionError("RuntimeError was not raised")

    assert periodic_callback.call_count == 3
    station_callback.start.assert_called_once()
    key_pruning_callback.start.assert_called_once()
    inactive_marking_callback.start.assert_called_once()


def test_backend_server_listen_without_optional_features() -> None:
    server = Mock()

    class StopEvent:
        async def wait(self) -> None:
            raise RuntimeError("stop test")

    with (
        patch("backend.server.db_connect", side_effect=_noop_async_context),
        patch("backend.server.cache_connect", side_effect=_noop_async_context),
        patch("backend.server.log.init") as log_init,
        patch("backend.server.tornado.web.Application", return_value=Mock()),
        patch("backend.server.tornado.httpserver.HTTPServer", return_value=server),
        patch(
            "backend.server.cache_set_station",
            new=AsyncMock(),
        ) as cache_set_station,
        patch("backend.server.tornado.ioloop.PeriodicCallback") as periodic_callback,
        patch("backend.server.tornado.ioloop.IOLoop.instance", return_value=Mock()),
        patch("backend.server.asyncio.Event", return_value=StopEvent()),
    ):
        try:
            asyncio.run(
                BackendServer().listen(
                    1,
                    per_station_logging=False,
                    enable_periodic_jobs=False,
                    enable_global_periodic_jobs=False,
                )
            )
        except RuntimeError:
            pass
        else:
            raise AssertionError("RuntimeError was not raised")

    log_init.assert_not_called()
    periodic_callback.assert_not_called()
    assert cache_set_station.await_count == 2
