from typing import Literal, overload

LDMLPluralCategory = Literal["zero", "one", "two", "few", "many", "other"]


class Locale:
    def __init__(self, name: str) -> None: ...
    def __repr__(self) -> str: ...


class PluralRules:
    @overload
    @classmethod
    def forLocale(cls, locale: Locale | str) -> "PluralRules": ...
    @overload
    @classmethod
    def forLocale(cls, locale: Locale | str, rule_type: object) -> "PluralRules": ...
    def select(self, value: int | float) -> LDMLPluralCategory: ...


__all__ = ["Locale", "PluralRules", "LDMLPluralCategory"]
