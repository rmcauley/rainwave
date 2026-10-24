from dataclasses import dataclass


@dataclass
class Bind:
    """
    A template element (or loop result) exposed to the caller.

    var_name is a JS identifier that is valid at the scope the bind was
    returned to, which is not necessarily the variable the element was created
    in: a bind that crosses an if/else boundary is re-declared outside of it.
    """

    var_name: str
    ts_type: str
    optional: bool = False


@dataclass
class ParseNodeResults:
    buffer: str
    binds: dict[str, Bind]
    js_variable_count: int
    imports: set[str]
