from typing import Any, TypeVar, overload

class QRCodeImage:
    def to_string(self) -> str: ...

_TImage = TypeVar("_TImage", bound=QRCodeImage)

@overload
def make(
    data: str | bytes,
    version: int = ...,
    error_correction: int = ...,
    box_size: int = ...,
    border: int = ...,
    image_factory: None = ...,
    **kwargs: Any,
) -> QRCodeImage: ...
@overload
def make(
    data: str | bytes,
    version: int = ...,
    error_correction: int = ...,
    box_size: int = ...,
    border: int = ...,
    image_factory: type[QRCodeImage] | None = ...,
    **kwargs: Any,
) -> QRCodeImage: ...
