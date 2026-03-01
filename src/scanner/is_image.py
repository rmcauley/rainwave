import mimetypes
from scanner.should_ignore_file import should_ignore_file

mimetypes.init()


def is_image(filename: str) -> bool:
    if should_ignore_file(filename):
        return False

    filetype = mimetypes.guess_type(filename)
    if len(filetype) > 0 and filetype[0] and filetype[0].count("image") == 1:
        return True
    return False
