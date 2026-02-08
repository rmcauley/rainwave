from typing import Any


class MetadataInsertionError(Exception):
    def __init__(self, value: Any) -> None:
        super().__init__()
        self.value = value

    def __str__(self) -> str:
        return repr(self.value)


class MetadataUpdateError(MetadataInsertionError):
    pass


class MetadataNotNamedError(MetadataInsertionError):
    pass


class MetadataNotFoundError(MetadataInsertionError):
    pass
