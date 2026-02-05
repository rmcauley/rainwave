import os
from backend import config


def get_album_art_url(album_id: int, sid: int | None = None) -> str:
    if not config.album_art_file_path:
        return ""
    elif sid and os.path.isfile(
        os.path.join(config.album_art_file_path, "%s_%s_320.jpg" % (sid, album_id))
    ):
        return "%s/%s_%s" % (config.album_art_url_path, sid, album_id)
    elif os.path.isfile(
        os.path.join(config.album_art_file_path, "a_%s_320.jpg" % album_id)
    ):
        return "%s/a_%s" % (config.album_art_url_path, album_id)
    return ""
