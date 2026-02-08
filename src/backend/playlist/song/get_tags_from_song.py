from typing import TypedDict
from mutagen.mp3 import MP3


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

        title_frame = f.tags.getall("TIT2")
        if len(title_frame) > 0 and len(str(title_frame[0])) > 0:
            title = str(title_frame[0]).strip()

        artist_frame = f.tags.getall("TPE1")
        if len(artist_frame) > 0 and len(str(artist_frame[0])) > 0:
            artist = str(artist_frame[0]).strip()

        album_frame = f.tags.getall("TALB")
        if len(album_frame) > 0 and len(str(album_frame[0]).strip()) > 0:
            album = str(album_frame[0]).strip()

        genre_frame = f.tags.getall("TCON")
        if len(genre_frame) > 0 and len(str(genre_frame[0])) > 0:
            genre = str(genre_frame[0]).strip()

        comment_frame = f.tags.getall("COMM")
        if len(comment_frame) > 0 and len(str(comment_frame[0])) > 0:
            comment = str(comment_frame[0]).strip()

        url_frame = f.tags.getall("WXXX")
        if len(url_frame) > 0 and len(str(url_frame[0])) > 0:
            url = str(url_frame[0]).strip()

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
