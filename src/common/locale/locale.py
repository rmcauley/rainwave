import os
import orjson
import tornado.escape

from .locale_types import RainwaveTranslationFile, RainwaveTranslationFileModel
from .rainwave_locale import RainwaveLocale
from common.libs import log

en_main = None
translations: dict[str, RainwaveLocale] = {}
locale_names: dict[str, str] = {}
locale_names_json = ""

lang_dir = os.path.join(os.path.dirname(__file__), "..", "..", "..", "lang")


def get_translation_file(filename: str) -> RainwaveTranslationFile:
    with open(
        os.path.join(lang_dir, filename),
        "r",
        encoding="utf-8",
    ) as raw_file:
        translation_file = RainwaveTranslationFileModel.model_validate(
            orjson.loads(raw_file.read())
        )
    return translation_file.root


def load_translations() -> None:
    global en_main
    global translations
    global locale_names
    global locale_names_json

    en_main = get_translation_file("en_MASTER.json")

    locale_names = {}
    for _root, _subdir, files in os.walk(lang_dir):
        for filename in files:
            if filename == "en_MASTER.json":
                continue
            if not filename.endswith(".json"):
                continue
            try:
                code = filename[:5].replace("_", "-")
                translation = get_translation_file(filename)

                # Check to see if the translation file has excess keys.
                for key in translation.keys():
                    if key not in en_main:
                        raise KeyError(
                            f"Language file error: Key {key} exists in {filename} but not in en_MAIN.json"
                        )

                code_name = translation["language_name_short"]
                if not isinstance(code_name, str):
                    raise Exception(
                        f"Language file error: language_name_short is not a string."
                    )
                locale_names[code] = code_name

                # Fill in missing keys
                translation.update(en_main)

                translations[code] = RainwaveLocale(code, en_main, translation)
            except Exception as e:
                log.exception(
                    "locale", "%s translation did not load." % filename[:-5], e
                )

    locale_names_json = tornado.escape.json_encode(locale_names)


def get_closest(code: str) -> RainwaveLocale:
    global translations

    if code in translations:
        return translations[code]

    if code[:2] in translations:
        return translations[code[:2]]

    return translations["en-CA"]
