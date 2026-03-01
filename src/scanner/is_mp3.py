import mimetypes
from scanner.should_ignore_file import should_ignore_file

mimetypes.init()


def is_mp3(filename: str) -> bool:
    if should_ignore_file(filename):
        return False

    filetype = mimetypes.guess_type(filename)
    if (
        len(filetype) > 0
        and filetype[0]
        and (filetype[0] == "audio/x-mpg" or filetype[0] == "audio/mpeg")
    ):
        return True
    return False
