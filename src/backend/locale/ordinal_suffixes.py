# Cross-reference src_frontend/language/translations.ts

ORDINAL_SUFFIXES_OTHER: dict[str, str] = {
    "de-DE": ".",
    "en-CA": "th",
    "es-CL": "º",
    "fi-FI": ".",
    "fr-CA": "e",
    "ko-KO": "번째",
    "nl-NL": "e",
    "pl-PL": ".",
    "pt-BR": "º",
    "pt-PT": "º",
    "ru-RU": "-e",
}

ORDINAL_SUFFIXES: dict[str, dict[str, str]] = {
    "de-DE": {},
    "en-CA": {
        "one": "st",
        "two": "nd",
        "few": "rd",
    },
    "es-CL": {},
    "fi-FI": {},
    "fr-CA": {
        "one": "er",
    },
    "ko-KO": {},
    "nl-NL": {},
    "pl-PL": {},
    "pt-BR": {},
    "pt-PT": {},
    "ru-RU": {},
}
