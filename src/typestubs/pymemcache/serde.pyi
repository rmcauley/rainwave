from typing import Any, Callable

Serializer = Callable[[Any], tuple[bytes, int]]
Deserializer = Callable[[bytes, int], Any]

pickle_serde: tuple[Serializer, Deserializer]

