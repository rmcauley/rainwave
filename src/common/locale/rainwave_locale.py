from typing import cast

from babel import Locale, UnknownLocaleError

from api import rainwave_typeddicts

from .ordinal_suffixes import ORDINAL_SUFFIXES, ORDINAL_SUFFIXES_OTHER
from .locale_types import (
    LDMLPluralRule,
    RainwaveTranslationFile,
    RainwaveTranslationPlural,
    RainwaveTranslationValue,
)


class RainwaveLocale:
    code: str
    _locale: Locale
    _translation: RainwaveTranslationFile
    _ordinal_suffixes_other: str
    _ordinal_suffixes: dict[str, str]
    missing: dict[str, RainwaveTranslationValue]

    @staticmethod
    def _load_babel_locale(code: str) -> Locale:
        # Some of our language codes (e.g. ko-KO) are not real CLDR locales,
        # so fall back to the bare language for plural rules.
        try:
            return Locale.parse(code, sep="-")
        except (UnknownLocaleError, ValueError):
            return Locale.parse(code.split("-")[0])

    def __init__(
        self,
        code: str,
        en_master: RainwaveTranslationFile,
        translation: RainwaveTranslationFile,
    ) -> None:
        super().__init__()
        self.code = code
        self._translation = translation
        self._ordinal_suffixes = ORDINAL_SUFFIXES.get(code, {})
        self._ordinal_suffixes_other = ORDINAL_SUFFIXES_OTHER.get(code, "")
        self._locale = self._load_babel_locale(code)

        # document lines missing
        self.missing = {}
        for key, value in en_master.items():
            if key not in translation:
                self.missing[key] = value

    def format_ordinal(self, value: int | float) -> str:
        category = self._locale.ordinal_form(value)
        suffix = self._ordinal_suffixes.get(category, self._ordinal_suffixes_other)
        return f"{value}{suffix}"

    def format_plural(
        self, translation_part: RainwaveTranslationPlural, value: int | float
    ) -> str:
        category = cast(LDMLPluralRule, self._locale.plural_form(value))
        suffix = translation_part.plurals.get(
            category, translation_part.plurals.get("other", "")
        )
        return f"{value}{suffix}"

    def translate(
        self,
        key: rainwave_typeddicts.TranslationKey,
        values: dict[str, str | int | float] | None = None,
    ) -> str:
        entry = self._translation[key]
        if not entry:
            return f"[[{key}]]"

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

    # These functions provide thin compatibility for HTML rendering through Tornado
    def gettext(self, message: str) -> str:
        return self.translate(cast(rainwave_typeddicts.TranslationKey, message))

    def pgettext(self, context: str, message: str) -> str:
        return self.translate(cast(rainwave_typeddicts.TranslationKey, message))

    def ngettext(self, singular: str, plural: str, count: int) -> str:
        return singular if count == 1 else plural
