from pathlib import Path

import orjson
import tornado.escape

from .locale_types import RainwaveTranslationFile, RainwaveTranslationFileModel
from .rainwave_locale import RainwaveLocale
from common import log

PROJECT_ROOT = Path(__file__).resolve().parents[3]
LANG_DIR = PROJECT_ROOT / "lang"
BASE_TRANSLATION_FILENAME = "en_MAIN.json"


def get_translation_file(filename: str) -> RainwaveTranslationFile:
    with (LANG_DIR / filename).open("r", encoding="utf-8") as raw_file:
        translation_file = RainwaveTranslationFileModel.model_validate(
            orjson.loads(raw_file.read())
        )
    return translation_file.root


def report_locale_error(message: str, error: Exception) -> None:
    log.exception("locale", message, error)


en_main = get_translation_file(BASE_TRANSLATION_FILENAME)
translations: dict[str, RainwaveLocale] = {}
locale_names: dict[str, str] = {}
locale_names_json = ""


for _root, _subdir, files in LANG_DIR.walk():
    for filename in files:
        if filename == BASE_TRANSLATION_FILENAME:
            continue
        if not filename.endswith(".json"):
            continue
        try:
            code = filename[:5].replace("_", "-")
            translation_overlay = get_translation_file(filename)

            # Fill in missing values in the target language by starting
            # with the main language, making a copy, then updating it
            # with the target language.
            translation = en_main.copy()
            translation.update(translation_overlay)

            code_name = translation["language_name_short"]
            if not isinstance(code_name, str):
                raise Exception(
                    f"Language file error: language_name_short is not a string."
                )
            locale_names[code] = code_name

            translations[code] = RainwaveLocale(code, en_main, translation)
        except Exception as e:
            report_locale_error("%s translation did not load." % filename[:-5], e)

locale_names_json = tornado.escape.json_encode(locale_names)


def get_closest(code: str) -> RainwaveLocale:
    global translations

    if code in translations:
        return translations[code]

    if code[:2] in translations:
        return translations[code[:2]]

    return translations["en-CA"]
