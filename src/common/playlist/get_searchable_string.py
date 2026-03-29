import unicodedata


def get_searchable_string(s: str) -> str:
    return "".join(
        ch
        for ch in unicodedata.normalize("NFD", s.lower())
        if not unicodedata.combining(ch)
    )
