# AI Generated stub file for pyinotify module

from typing import Any, Callable

IN_ATTRIB: int
IN_CREATE: int
IN_CLOSE_WRITE: int
IN_DELETE: int
IN_MOVED_TO: int
IN_MOVED_FROM: int
IN_MOVE_SELF: int
IN_EXCL_UNLINK: int

class Event:
    dir: bool
    pathname: str
    maskname: str
    mask: int

class ProcessEvent:
    def __init__(
        self, pevent: Callable[[Event], Any] | None = ..., **kargs: Any
    ) -> None: ...
    def my_init(self, **kargs: Any) -> None: ...
    def __call__(self, event: Event) -> Any: ...
    def process_default(self, event: Event) -> Any: ...

class WatchManager:
    def __init__(self, exclude_filter: Callable[[str], bool] = ...) -> None: ...
    def add_watch(
        self,
        path: str | list[str],
        mask: int,
        proc_fun: Callable[[Event], Any] | ProcessEvent | None = ...,
        rec: bool = ...,
        auto_add: bool = ...,
        do_glob: bool = ...,
        quiet: bool = ...,
        exclude_filter: Callable[[str], bool] | None = ...,
    ) -> dict[str, int]: ...
    def close(self) -> None: ...

class Notifier:
    def __init__(
        self,
        watch_manager: WatchManager,
        default_proc_fun: Callable[[Event], Any] | ProcessEvent | None = ...,
        read_freq: int = ...,
        threshold: int = ...,
        timeout: int | None = ...,
    ) -> None: ...
    def loop(
        self,
        callback: Callable[["Notifier"], bool] | None = ...,
        daemonize: bool = ...,
        **args: Any,
    ) -> None: ...
