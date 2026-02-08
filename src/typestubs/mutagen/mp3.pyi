from typing import BinaryIO, Protocol


class _Frame(Protocol):
    id: str
    def __str__(self) -> str: ...


class _Tags(Protocol):
    def getall(self, key: str) -> list[_Frame]: ...


class _Info(Protocol):
    length: float


class MP3:
    tags: _Tags | None
    info: _Info

    def __init__(self, filething: BinaryIO | str, *, translate: bool = ...) -> None: ...
