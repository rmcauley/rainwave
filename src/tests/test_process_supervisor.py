# pyright: reportAttributeAccessIssue=false, reportPrivateUsage=false

import signal
from unittest.mock import Mock, patch
from typing import Any

import pytest

from common.processes.supervisor import (
    ProcessSpec,
    _run_child_process,
    monitor_children,
    run_forked_processes,
)


def _target(**kwargs: object) -> None:
    pass


class _FakeProcess:
    def __init__(self, name: str, exitcode: int | None = 0) -> None:
        super().__init__()
        self.name = name
        self.exitcode = exitcode
        self.start = Mock()
        self.interrupt = Mock()
        self.terminate = Mock()
        self.kill = Mock()
        self.join = Mock()
        self.is_alive = Mock(return_value=False)


class _FakeMultiprocessingContext:
    def __init__(self) -> None:
        super().__init__()
        self.processes: list[_FakeProcess] = []
        self.process_args: list[dict[str, Any]] = []
        self.exitcodes_by_name: dict[str, list[int | None]] = {}

    def Process(self, **kwargs: object) -> _FakeProcess:
        name = str(kwargs["name"])
        exitcodes = self.exitcodes_by_name.get(name, [0])
        exitcode = exitcodes.pop(0)
        process = _FakeProcess(name, exitcode=exitcode)
        self.processes.append(process)
        self.process_args.append(kwargs)
        return process


def test_run_forked_processes_creates_children() -> None:
    context = _FakeMultiprocessingContext()

    with (
        patch(
            "common.processes.supervisor.multiprocessing.get_context",
            return_value=context,
        ),
        patch("common.processes.supervisor.monitor_children"),
    ):
        run_forked_processes(
            [
                ProcessSpec("process-one", _target, {"value": 1}),
                ProcessSpec("process-two", _target, {"value": 2}),
            ]
        )

    assert [process.name for process in context.processes] == [
        "process-one",
        "process-two",
    ]
    assert [process.start.call_count for process in context.processes] == [1, 1]
    assert context.process_args[0]["target"] is _run_child_process
    assert context.process_args[0]["kwargs"]["spec"] == ProcessSpec(
        "process-one", _target, {"value": 1}
    )
    assert context.process_args[1]["target"] is _run_child_process
    assert context.process_args[1]["kwargs"]["spec"] == ProcessSpec(
        "process-two", _target, {"value": 2}
    )


def test_child_process_restores_signal_handlers_before_running_target() -> None:
    target = Mock()
    sigint_handler = Mock()
    sigterm_handler = Mock()

    with patch("common.processes.supervisor.signal.signal") as signal_func:
        _run_child_process(
            spec=ProcessSpec("process-one", target, {"value": 1}),
            sigint_handler=sigint_handler,
            sigterm_handler=sigterm_handler,
        )

    assert signal_func.call_args_list[0].args == (signal.SIGINT, sigint_handler)
    assert signal_func.call_args_list[1].args == (signal.SIGTERM, sigterm_handler)
    target.assert_called_once_with(value=1)


def test_monitor_children_stops_siblings_when_child_fails() -> None:
    failed_process = _FakeProcess("process-one", exitcode=1)
    live_process = _FakeProcess("process-two", exitcode=None)
    live_process.is_alive.return_value = True
    spec_one = ProcessSpec("process-one", _target, {"value": 1})
    spec_two = ProcessSpec("process-two", _target, {"value": 2})

    with pytest.raises(RuntimeError, match="process-one exited with status 1"):
        monitor_children(
            [failed_process, live_process],
            {failed_process: spec_one, live_process: spec_two},
            _FakeMultiprocessingContext(),
            {},
            0,
            signal.SIG_DFL,
            signal.SIG_DFL,
            lambda: None,
        )

    live_process.interrupt.assert_called_once()
    live_process.terminate.assert_called_once()
    live_process.kill.assert_called_once()


def test_run_forked_processes_restarts_exited_child() -> None:
    context = _FakeMultiprocessingContext()
    context.exitcodes_by_name["process-one"] = [0, 1, 0]

    with (
        patch(
            "common.processes.supervisor.multiprocessing.get_context",
            return_value=context,
        ),
        pytest.raises(RuntimeError, match="process-one exited with status 0"),
    ):
        run_forked_processes(
            [ProcessSpec("process-one", _target, {"value": 1})],
            max_restarts=2,
        )

    assert [process.name for process in context.processes] == [
        "process-one",
        "process-one",
        "process-one",
    ]
    assert [process.start.call_count for process in context.processes] == [1, 1, 1]


def test_monitor_children_does_not_restart_after_shutdown_signal() -> None:
    failed_process = _FakeProcess("process-one", exitcode=1)
    live_process = _FakeProcess("process-two", exitcode=None)
    live_process.is_alive.return_value = True
    context = _FakeMultiprocessingContext()

    monitor_children(
        [failed_process, live_process],
        {
            failed_process: ProcessSpec("process-one", _target, {"value": 1}),
            live_process: ProcessSpec("process-two", _target, {"value": 2}),
        },
        context,
        {},
        1,
        signal.SIG_DFL,
        signal.SIG_DFL,
        lambda: 15,
    )

    assert context.processes == []
    live_process.interrupt.assert_called_once()
