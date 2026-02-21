from typing import Any


class TestModeCache:
    def __init__(self) -> None:
        super().__init__()
        self.vars: dict[bytes, Any] = {}

    async def get(self, key: bytes) -> Any | None:
        if not key in self.vars:
            return None
        else:
            return self.vars[key]

    async def set(self, key: bytes, value: Any) -> None:
        self.vars[key] = value
