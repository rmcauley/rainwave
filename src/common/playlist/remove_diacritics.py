import unicodedata


def remove_diacritics(s: str) -> str:
    return "".join(
        ch for ch in unicodedata.normalize("NFD", s) if not unicodedata.combining(ch)
    )
