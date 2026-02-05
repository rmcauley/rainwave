from typing import Union, Literal

LDMLPluralCategory = Literal["zero", "one", "two", "few", "many", "other"]

class Locale:
    def __init__(self, name: str) -> None: ...
    def __repr__(self) -> str: ...

class PluralRules:
    CARDINAL: int
    ORDINAL: int

    @classmethod
    def forLocale(cls, locale: Union[Locale, str], rule_type: int) -> "PluralRules": ...
    def select(self, value: Union[int, float]) -> LDMLPluralCategory: ...

__all__ = ["Locale", "PluralRules", "LDMLPluralCategory"]
