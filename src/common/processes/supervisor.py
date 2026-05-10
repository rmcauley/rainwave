import multiprocessing
import signal
import time
from collections.abc import Callable
from dataclasses import dataclass
from types import FrameType
from typing import Any

CHILD_SHUTDOWN_TIMEOUT_SECONDS = 10
CHILD_TERMINATE_TIMEOUT_SECONDS = 5


@dataclass(frozen=True)
class ProcessSpec:
    name: str
    target: Callable[..., None]
    kwargs: dict[str, Any]


@dataclass
class ShutdownState:
    signal_number: int | None = None


def run_forked_processes(
    process_specs: list[ProcessSpec], *, max_restarts: int = 5
) -> None:
    context = multiprocessing.get_context("fork")
    processes: list[Any] = []
    specs_by_process: dict[Any, ProcessSpec] = {}
    restart_counts: dict[str, int] = {}
    shutdown_state = ShutdownState()

    def request_shutdown(signum: int, frame: FrameType | None) -> None:
        shutdown_state.signal_number = signum

    previous_sigint_handler = signal.getsignal(signal.SIGINT)
    previous_sigterm_handler = signal.getsignal(signal.SIGTERM)
    signal.signal(signal.SIGINT, request_shutdown)
    signal.signal(signal.SIGTERM, request_shutdown)

    try:
        for spec in process_specs:
            process = start_process(
                context, spec, previous_sigint_handler, previous_sigterm_handler
            )
            processes.append(process)
            specs_by_process[process] = spec

        monitor_children(
            processes,
            specs_by_process,
            context,
            restart_counts,
            max_restarts,
            previous_sigint_handler,
            previous_sigterm_handler,
            lambda: shutdown_state.signal_number,
        )

        if shutdown_state.signal_number == signal.SIGINT:
            raise KeyboardInterrupt
    except BaseException:
        stop_children(processes)
        raise
    finally:
        signal.signal(signal.SIGINT, previous_sigint_handler)
        signal.signal(signal.SIGTERM, previous_sigterm_handler)


def _run_child_process(
    *,
    spec: ProcessSpec,
    sigint_handler: Any,
    sigterm_handler: Any,
) -> None:
    signal.signal(signal.SIGINT, sigint_handler)
    signal.signal(signal.SIGTERM, sigterm_handler)
    spec.target(**spec.kwargs)


def start_process(
    context: Any, spec: ProcessSpec, sigint_handler: Any, sigterm_handler: Any
) -> Any:
    process = context.Process(
        name=spec.name,
        target=_run_child_process,
        kwargs={
            "spec": spec,
            "sigint_handler": sigint_handler,
            "sigterm_handler": sigterm_handler,
        },
    )
    process.start()
    return process


def monitor_children(
    processes: list[Any],
    specs_by_process: dict[Any, ProcessSpec],
    context: Any,
    restart_counts: dict[str, int],
    max_restarts: int,
    sigint_handler: Any,
    sigterm_handler: Any,
    get_shutdown_signal: Callable[[], int | None],
) -> None:
    try:
        while processes:
            if get_shutdown_signal() is not None:
                stop_children(processes)
                return

            for process in list(processes):
                process.join(timeout=0.5)
                if process.exitcode is None:
                    continue

                processes.remove(process)
                spec = specs_by_process.pop(process)

                if get_shutdown_signal() is not None:
                    stop_children(processes)
                    return

                restart_count = restart_counts.get(spec.name, 0)
                if restart_count < max_restarts:
                    restart_counts[spec.name] = restart_count + 1
                    replacement = start_process(
                        context, spec, sigint_handler, sigterm_handler
                    )
                    processes.append(replacement)
                    specs_by_process[replacement] = spec
                    continue

                stop_children(processes)
                raise RuntimeError(
                    "%s exited with status %s" % (process.name, process.exitcode)
                )
    except KeyboardInterrupt:
        stop_children(processes)
        raise


def stop_children(processes: list[Any]) -> None:
    for process in processes:
        if process.is_alive():
            process.interrupt()

    deadline = time.monotonic() + CHILD_SHUTDOWN_TIMEOUT_SECONDS
    for process in processes:
        remaining = max(0.0, deadline - time.monotonic())
        process.join(timeout=remaining)

    for process in processes:
        if process.is_alive():
            process.terminate()

    for process in processes:
        process.join(timeout=CHILD_TERMINATE_TIMEOUT_SECONDS)

    for process in processes:
        if process.is_alive():
            process.kill()

    for process in processes:
        process.join(timeout=CHILD_TERMINATE_TIMEOUT_SECONDS)
