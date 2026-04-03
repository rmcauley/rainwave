from attr import dataclass


@dataclass
class ParseNodeResults:
    buffer: str
    binds: dict[str, str]
    js_variable_count: int
    imports: set[str]
