from .ordinal_suffixes import ORDINAL_SUFFIXES, ORDINAL_SUFFIXES_OTHER
from .locale_types import (
    RainwaveTranslationFile,
    RainwaveTranslationPlural,
    RainwaveTranslationValue,
)
from icu import Locale, PluralRules


class RainwaveLocale:
    code: str
    _translation: RainwaveTranslationFile
    _ordinal_suffixes_other: str
    _ordinal_suffixes: dict[str, str]
    missing: dict[str, RainwaveTranslationValue]

    def __init__(
        self,
        code: str,
        en_master: RainwaveTranslationFile,
        translation: RainwaveTranslationFile,
    ) -> None:
        self.code = code
        self._translation = translation
        self._ordinal_suffixes = ORDINAL_SUFFIXES.get(code, {})
        self._ordinal_suffixes_other = ORDINAL_SUFFIXES_OTHER.get(code, "")
        icu_locale = Locale(code)
        self._ordinal = PluralRules.forLocale(icu_locale, PluralRules.ORDINAL)
        self._cardinal = PluralRules.forLocale(icu_locale, PluralRules.CARDINAL)

        # document lines missing
        self.missing = {}
        for key, value in en_master.items():
            if key not in translation:
                self.missing[key] = value

    def format_ordinal(self, value: int | float) -> str:
        category = self._ordinal.select(value)
        suffix = self._ordinal_suffixes.get(category, self._ordinal_suffixes_other)
        return f"{value}{suffix}"

    def format_plural(
        self, translation_part: RainwaveTranslationPlural, value: int | float
    ) -> str:
        category = self._cardinal.select(value)
        suffix = translation_part.plurals.get(
            category, translation_part.plurals.get("other", "")
        )
        return f"{value}{suffix}"

    def translate(self, key: str, values: dict[str, str | int | float]) -> str:
        entry = self._translation[key]
        if not entry:
            return f"[[{entry}]]"

        if isinstance(entry, str):
            return entry

        if not values:
            return "[[no args provided]]"

        text = ""
        for token in entry:
            if isinstance(token, str):
                text += token
            else:
                tokenText = ""
                tokenValue = values.get(token.key)

                if token.type == "ordinal" and isinstance(tokenValue, (int, float)):
                    tokenText = self.format_ordinal(tokenValue)
                elif token.type == "plural" and isinstance(tokenValue, (int, float)):
                    tokenText = self.format_plural(token, tokenValue)
                elif token.type == "substitute" and tokenValue is not None:
                    tokenText = str(tokenValue)
                else:
                    tokenText = f"[[{token.key}]]"

                text += tokenText

        return text
