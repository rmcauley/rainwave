from typing import TypedDict
from mutagen.mp3 import MP3, _Tags as Tags  # pyright: ignore[reportPrivateUsage]


# Usable if you want to throw an exception on a file but still continue scanning other files.
class PassableScanError(Exception):
    pass


class TagsFromFile(TypedDict):
    title: str
    album: str
    artist: str
    genre: str | None
    comment: str | None
    url: str | None
    length: int


def get_tag(tags: Tags, tag: str) -> str | None:
    frame = tags.getall(tag)
    if len(frame) > 0 and len(str(frame[-1]).strip()) > 0:
        return str(frame[-1]).strip()
    return None


def load_tag_from_file(filename: str) -> TagsFromFile:
    title: str | None = None
    album: str | None = None
    artist: str | None = None
    genre: str | None = None
    comment: str | None = None
    url: str | None = None
    length: int | None = None

    with open(filename, "rb") as mp3file:
        f = MP3(mp3file, translate=False)

        if not f.tags:
            raise PassableScanError('Song filename "%s" has no tags.' % filename)

        title = get_tag(f.tags, "TIT2")
        artist = get_tag(f.tags, "TPE1")
        album = get_tag(f.tags, "TALB")
        genre = get_tag(f.tags, "TCON")
        comment = get_tag(f.tags, "COMM")
        url = get_tag(f.tags, "WXXX")
        length = int(f.info.length)

    if title is None:
        raise PassableScanError(f'Song filename "{filename}" has no title tag.')
    if artist is None:
        raise PassableScanError(f'Song filename "{filename}" has no artist tag.')
    if album is None:
        raise PassableScanError(f'Song filename "{filename}" has no album tag.')

    return {
        "album": album,
        "artist": artist,
        "comment": comment,
        "genre": genre,
        "length": length,
        "title": title,
        "url": url,
    }
