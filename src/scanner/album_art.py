from dataclasses import dataclass
import os

from PIL import Image, ImageFile

from common import config, log
from common.db.cursor import RainwaveCursor
from scanner.exceptions import NonFatalScannerError
from scanner.scan_errors import add_scan_error


@dataclass
class AlbumArt:
    filename: str
    sid: int


MAX_IMAGE_DIMENSION = 640
MIN_IMAGE_DIMENSION = 320
unmatched_art: list[AlbumArt] = []


def get_album_art_path(sid: int, album_id: int) -> str:
    return os.path.join(
        config.album_art_file_path,
        "%s_%s_320.jpg" % (sid, album_id),
    )


def write_unmatched_art_log() -> None:
    if config.log_dir:
        with open(
            os.path.join(config.log_dir, "rw_unmatched_art.log"), "w"
        ) as unmatched_log:
            for art in unmatched_art:
                unmatched_log.write(art.filename)
                unmatched_log.write("\n")


async def reconcile_album_art(cursor: RainwaveCursor, album_id: int) -> None:
    for sid in await cursor.fetch_list(
        "SELECT sid FROM r4_album_sid WHERE album_id = %s", (album_id,), row_type=int
    ):
        for art_priority_sid in config.album_art_order[sid]:
            art_path = get_album_art_path(art_priority_sid, album_id)
            if os.path.exists(art_path):
                await cursor.update(
                    "UPDATE r4_album_sid SET album_art_url = %s WHERE album_id = %s AND sid = %s",
                    (f"{art_priority_sid}_{album_id}", album_id, sid),
                )
                break


async def process_album_art(cursor: RainwaveCursor, filename: str, sid: int) -> None:
    try:
        log.debug("album_art", filename)
        directory = os.path.dirname(filename) + os.sep
        album_ids = await cursor.fetch_list(
            "SELECT DISTINCT album_id FROM r4_songs WHERE song_filename LIKE %s || '%%'",
            (directory,),
            row_type=int,
        )
        if not album_ids or len(album_ids) == 0:
            unmatched_art.append(AlbumArt(filename, sid))
            return

        with Image.open(filename) as imgfile:
            img: Image.Image | ImageFile.ImageFile = imgfile
            if img.mode != "RGB":
                img = img.convert("RGB")

            if img.size[0] > MAX_IMAGE_DIMENSION or img.size[1] > MAX_IMAGE_DIMENSION:
                img.thumbnail(
                    (MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS
                )

            if img.size[0] < MIN_IMAGE_DIMENSION or img.size[1] < MIN_IMAGE_DIMENSION:
                await add_scan_error(
                    filename,
                    NonFatalScannerError(
                        "Small Art Warning: %sx%s" % (img.size[0], img.size[1])
                    ),
                )

            for album_id in album_ids:
                img.save(get_album_art_path(sid, album_id))
                await reconcile_album_art(cursor, album_id)

                log.debug(
                    "album_art", "Scanned %s for album ID %s." % (filename, album_ids)
                )
    except (IOError, OSError) as err:
        await add_scan_error(
            filename,
            NonFatalScannerError(
                f"Could not open album art. (this can happen if a directory has been deleted) {err}"
            ),
        )
    except Exception as e:
        await add_scan_error(filename, e)


async def process_unmatched_art(cursor: RainwaveCursor) -> None:
    for art in unmatched_art:
        await process_album_art(cursor, art.filename, art.sid)
