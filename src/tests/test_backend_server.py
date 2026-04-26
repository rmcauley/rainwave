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


def test_backend_server_start_single_station_without_periodic_jobs() -> None:
    def _fake_asyncio_run(coroutine: object) -> None:
        if hasattr(coroutine, "close"):
            coroutine.close()

    with (
        patch("backend.server.zeromq.init_proxy") as init_proxy,
        patch(
            "backend.server.asyncio.run", side_effect=_fake_asyncio_run
        ) as asyncio_run,
    ):
        BackendServer().start(
            per_station_logging=False,
            station_id_list=[1],
            enable_periodic_jobs=False,
            initialize_proxy=False,
        )

    init_proxy.assert_not_called()
    asyncio_run.assert_called_once()


def test_backend_server_start_enables_periodic_jobs_and_forks() -> None:
    callback_one = Mock()
    callback_two = Mock()

    def _fake_asyncio_run(coroutine: object) -> None:
        if hasattr(coroutine, "close"):
            coroutine.close()

    with (
        patch("backend.server.zeromq.init_proxy") as init_proxy,
        patch(
            "backend.server.tornado.ioloop.PeriodicCallback",
            side_effect=[callback_one, callback_two],
        ),
        patch("backend.server.tornado.process.fork_processes") as fork_processes,
        patch("backend.server.tornado.process.task_id", return_value=1),
        patch(
            "backend.server.asyncio.run", side_effect=_fake_asyncio_run
        ) as asyncio_run,
    ):
        BackendServer().start(
            per_station_logging=True,
            station_id_list=[1, 2],
            enable_periodic_jobs=True,
            initialize_proxy=True,
        )

    init_proxy.assert_called_once()
    callback_one.start.assert_called_once()
    callback_two.start.assert_called_once()
    fork_processes.assert_called_once_with(2, max_restarts=0)
    asyncio_run.assert_called_once()


def test_backend_server_start_skips_listen_when_no_task_id() -> None:
    def _fake_asyncio_run(coroutine: object) -> None:
        if hasattr(coroutine, "close"):
            coroutine.close()

    with (
        patch("backend.server.tornado.process.fork_processes") as fork_processes,
        patch("backend.server.tornado.process.task_id", return_value=None),
        patch(
            "backend.server.asyncio.run", side_effect=_fake_asyncio_run
        ) as asyncio_run,
    ):
        BackendServer().start(
            per_station_logging=True,
            station_id_list=[1, 2],
            enable_periodic_jobs=False,
            initialize_proxy=False,
        )

    fork_processes.assert_called_once_with(2, max_restarts=0)
    asyncio_run.assert_not_called()


def test_backend_server_listen_initializes_and_shuts_down() -> None:
    cursor = AsyncMock()
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
            "backend.server.get_cursor",
            side_effect=lambda: _cursor_context(cursor),
        ),
        patch(
            "backend.server.prepare_cooldown_algorithm",
            new=AsyncMock(),
        ) as prepare_cooldown_algorithm,
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
                BackendServer()._listen(
                    1,
                    per_station_logging=True,
                    enable_periodic_jobs=True,
                )
            )
        except RuntimeError as exc:
            assert str(exc) == "stop test"
        else:
            raise AssertionError("RuntimeError was not raised")

    log_init.assert_called_once()
    app_ctor.assert_called_once()
    server.listen.assert_called_once()
    prepare_cooldown_algorithm.assert_awaited_once_with(cursor, 1)
    assert cache_set_station.await_count == 2
    cooldown_callback.start.assert_called_once()
    ioloop.stop.assert_called_once()
    server.stop.assert_called_once()


def test_backend_server_listen_without_optional_features() -> None:
    cursor = AsyncMock()
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
            "backend.server.get_cursor",
            side_effect=lambda: _cursor_context(cursor),
        ),
        patch(
            "backend.server.prepare_cooldown_algorithm",
            new=AsyncMock(),
        ),
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
                BackendServer()._listen(
                    1,
                    per_station_logging=False,
                    enable_periodic_jobs=False,
                )
            )
        except RuntimeError:
            pass
        else:
            raise AssertionError("RuntimeError was not raised")

    log_init.assert_not_called()
    periodic_callback.assert_not_called()
    assert cache_set_station.await_count == 2
