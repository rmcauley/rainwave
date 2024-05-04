import os
import os.path
from time import time as timestamp
import mimetypes
import sys
import psutil
import traceback
from PIL import Image
import pyinotify
from pyinotify import ProcessEvent, IN_DELETE, IN_MOVED_FROM

from libs import config
from libs import log
from libs import cache
from libs import db

from rainwave import playlist
from rainwave.playlist_objects.song import PassableScanError

mimetypes.init()

_found_album_art = []
_on_screen = False


class AlbumArtNoAlbumFoundError(PassableScanError):
    pass


def write_unmatched_art_log():
    with open(
        os.path.join(config.get_directory("log_dir"), "rw_unmatched_art.log"), "w"
    ) as unmatched_log:
        for album_art_tuple in _found_album_art:
            unmatched_log.write(album_art_tuple[0])
            unmatched_log.write("\n")


def set_on_screen(on_screen):
    global _on_screen
    _on_screen = on_screen


def _common_init():
    try:
        p = psutil.Process(os.getpid())
        p.set_nice(10)
    except:
        pass

    try:
        p = psutil.Process(os.getpid())
        p.set_ionice(psutil.IOPRIO_CLASS_IDLE)
    except:
        pass


def full_music_scan(full_reset):
    _common_init()
    db.connect()
    cache.connect()
    db.c.start_transaction()

    try:
        if full_reset:
            db.c.update("UPDATE r4_songs SET song_file_mtime = 0")
        db.c.update("UPDATE r4_songs SET song_scanned = FALSE")

        _scan_all_directories()

        # This procedure is slow but steady and easy to use.
        dead_songs = db.c.fetch_list(
            "SELECT song_id FROM r4_songs WHERE song_scanned = FALSE AND song_verified = TRUE"
        )
        for song_id in dead_songs:
            song = playlist.Song.load_from_id(song_id)
            song.disable()

        db.c.commit()

        _process_found_album_art()
        print()
        write_unmatched_art_log()
    except:
        db.c.rollback()
        raise


def full_art_update():
    _common_init()
    _scan_all_directories(art_only=True)
    _process_found_album_art()
    write_unmatched_art_log()
    print()


def _print_to_screen_inline(txt):
    if _on_screen:
        txt += " " * (80 - len(txt))
        print("\r" + txt, end="")
        sys.stdout.flush()


def _scan_all_directories(art_only=False):
    total_files = 0
    file_counter = 0
    for directory, sids in config.get("song_dirs").items():
        for root, _subdirs, files in os.walk(directory, followlinks=True):
            total_files += len(files)
            _print_to_screen_inline(f"Prepping {total_files}")

    for directory, sids in config.get("song_dirs").items():
        for root, _subdirs, files in os.walk(directory, followlinks=True):
            for filename in files:
                filename = os.path.join(root, filename)
                if art_only and not _is_image(filename):
                    pass
                else:
                    _scan_file(filename, sids)
                file_counter += 1
                _print_to_screen_inline(
                    "%s %s / %s" % (directory, file_counter, total_files)
                )
        _print_to_screen_inline("\n")


def _scan_directory(directory, sids):
    # Normalize and add a trailing separator to the directory name
    directory = os.path.join(os.path.normpath(directory), "")

    songs = db.c.fetch_list(
        "SELECT song_id FROM r4_songs WHERE song_filename LIKE %s || '%%' AND song_verified = TRUE",
        (directory,),
    )
    for song_id in songs:
        db.c.update(
            "UPDATE r4_songs SET song_scanned = FALSE WHERE song_id = %s", (song_id,)
        )

    do_scan = False
    try:
        os.stat(directory)
        do_scan = True
    except (IOError, OSError):
        log.debug("scan", "Directory %s no longer exists." % directory)

    if do_scan and len(sids) > 0:
        for root, _subdirs, files in os.walk(directory, followlinks=True):
            for filename in files:
                filename = os.path.join(root, filename)
                _scan_file(filename, sids)

    songs = db.c.fetch_list(
        "SELECT song_id FROM r4_songs WHERE song_filename LIKE %s || '%%' AND song_scanned = FALSE AND song_verified = TRUE",
        (directory,),
    )
    for song_id in songs:
        s = playlist.Song.load_from_id(song_id)
        log.debug("scan", "Disabling song: %s" % s.filename)
        s.disable()


def _scan_file(filename, sids):
    s = None
    if _is_mp3(filename):
        new_mtime = None
        try:
            new_mtime = os.stat(filename)[8]
        except IOError as e:
            _add_scan_error(filename, e)
            _disable_file(filename)
        try:
            log.debug("scan", "sids: {} Scanning file: {}".format(sids, filename))
            # Only scan the file if we don't have a previous mtime for it, or the mtime is different
            old_mtime = db.c.fetch_var(
                "SELECT song_file_mtime FROM r4_songs WHERE song_filename = %s AND song_verified = TRUE",
                (filename,),
            )
            if old_mtime != new_mtime or not old_mtime:
                log.debug("scan", "mtime mismatch, scanning for changes")
                s = playlist.Song.load_from_file(filename, sids)
                if not db.c.fetch_var(
                    "SELECT album_id FROM r4_songs WHERE song_id = %s", (s.id,)
                ):
                    _add_scan_error(
                        s.filename,
                        PassableScanError(
                            "%s was scanned but has no album ID." % s.filename
                        ),
                    )
                    s.disable()
            else:
                log.debug("scan", "mtime match, no action taken.")
                db.c.update(
                    "UPDATE r4_songs SET song_scanned = TRUE WHERE song_filename = %s",
                    (filename,),
                )
            _process_found_album_art(os.path.dirname(filename))
        except IOError as e:
            _add_scan_error(filename, e)
            _disable_file(filename)
        except Exception as e:
            _add_scan_error(filename, e, sys.exc_info())
            _disable_file(filename)
    elif _is_image(filename):
        try:
            _process_album_art(filename, sids)
        except AlbumArtNoAlbumFoundError:
            _found_album_art.append((filename, sids))
    return True


bad_extensions = (".tmp", ".filepart")


def _is_bad_extension(filename):
    global bad_extensions

    if filename.split(".")[-1].lower() in bad_extensions:
        return True
    return False


def _is_mp3(filename):
    if _is_bad_extension(filename):
        return False

    filetype = mimetypes.guess_type(filename)
    if (
        len(filetype) > 0
        and filetype[0]
        and (filetype[0] == "audio/x-mpg" or filetype[0] == "audio/mpeg")
    ):
        return True
    return False


def _is_image(filename):
    if _is_bad_extension(filename):
        return False

    filetype = mimetypes.guess_type(filename)
    if len(filetype) > 0 and filetype[0] and filetype[0].count("image") == 1:
        return True
    return False


def _process_found_album_art(dirname=None):
    if dirname and not dirname.endswith(os.sep):
        dirname += os.sep
    matched_count = 0
    for album_art_tuple in _found_album_art:
        filename, sids = album_art_tuple
        if not dirname or (os.path.dirname(filename) + os.sep) == dirname:
            try:
                if _process_album_art(filename, sids):
                    matched_count += 1
            except:
                pass
            if not dirname:
                _print_to_screen_inline(
                    "Matched album art: %s/%s"
                    % (matched_count, len(_found_album_art) - 1)
                )
            else:
                print(f"Found album art for {dirname}")
    if not dirname:
        _print_to_screen_inline("\n")


def _process_album_art(filename, sids):
    # Processes album art by finding the album IDs that are associated with the songs that exist
    # in the same directory as the image file.
    if not config.get("album_art_enabled"):
        return True
    try:
        directory = os.path.dirname(filename) + os.sep
        album_ids = db.c.fetch_list(
            "SELECT DISTINCT album_id FROM r4_songs WHERE song_filename LIKE %s || '%%'",
            (directory,),
        )
        if not album_ids or len(album_ids) == 0:
            raise AlbumArtNoAlbumFoundError
        with Image.open(filename) as im_original:
            if not im_original:
                raise IOError
            if im_original.mode != "RGB":
                im_original = im_original.convert("RGB")
            im_320 = im_original
            im_240 = im_original
            im_120 = im_original
            if im_original.size[0] > 420 or im_original.size[1] > 420:
                im_320 = im_original.copy()
                im_320.thumbnail((320, 320), Image.Resampling.LANCZOS)
            if im_original.size[0] > 240 or im_original.size[1] > 240:
                im_240 = im_original.copy()
                im_240.thumbnail((240, 240), Image.Resampling.LANCZOS)
            if im_original.size[0] > 160 or im_original.size[1] > 160:
                im_120 = im_original.copy()
                im_120.thumbnail((120, 120), Image.Resampling.LANCZOS)
            if im_original.size[0] < 320 or im_original.size[1] < 320:
                _add_scan_error(
                    filename,
                    PassableScanError(
                        "Small Art Warning: %sx%s"
                        % (im_original.size[0], im_original.size[1])
                    ),
                )
            for album_id in album_ids:
                for sid in sids:
                    im_120.save(
                        os.path.join(
                            config.get("album_art_file_path"),
                            "%s_%s_120.jpg" % (sid, album_id),
                        )
                    )
                    im_240.save(
                        os.path.join(
                            config.get("album_art_file_path"),
                            "%s_%s_240.jpg" % (sid, album_id),
                        )
                    )
                    im_320.save(
                        os.path.join(
                            config.get("album_art_file_path"),
                            "%s_%s_320.jpg" % (sid, album_id),
                        )
                    )
                a_120_path = os.path.join(
                    config.get("album_art_file_path"), "a_%s_120.jpg" % (album_id)
                )
                # sids[0] is the origin SID
                if sids[0] == config.get("album_art_master_sid") or not os.path.exists(
                    a_120_path
                ):
                    im_120.save(a_120_path)
                    im_240.save(
                        os.path.join(
                            config.get("album_art_file_path"),
                            "a_%s_240.jpg" % (album_id),
                        )
                    )
                    im_320.save(
                        os.path.join(
                            config.get("album_art_file_path"),
                            "a_%s_320.jpg" % (album_id),
                        )
                    )
            log.debug(
                "album_art", "Scanned %s for album ID %s." % (filename, album_ids)
            )
            return True
    except (IOError, OSError) as err:
        _add_scan_error(
            filename,
            PassableScanError(
                f"Could not open album art. (this can happen if a directory has been deleted) {err}"
            ),
        )
    except AlbumArtNoAlbumFoundError:
        raise
    except Exception as e:
        _add_scan_error(filename, e)
    return False


def _disable_file(filename):
    # aka "delete this off the playlist"
    log.debug("scan", "Attempting to disable file: {}".format(filename))
    try:
        song = playlist.Song.load_from_deleted_file(filename)
        if song:
            log.debug("scan", "Found song to disable.")
            song.disable()
            log.debug("scan", "Song disabled: {}".format(filename))
        else:
            log.debug("scan", "Found no song by that filename.")
    except Exception as e:
        _add_scan_error(filename, e)


def _add_scan_error(filename, xception, full_exc=None):
    scan_errors = []
    try:
        scan_errors = cache.get("backend_scan_errors")
    except:
        pass
    if not scan_errors:
        scan_errors = []

    eo = {
        "time": int(timestamp()),
        "file": filename,
        "type": xception.__class__.__name__,
        "error": str(xception),
        "traceback": "",
    }
    if (
        not isinstance(xception, PassableScanError)
        and not isinstance(xception, IOError)
        and not isinstance(xception, OSError)
    ):
        if full_exc:
            eo["traceback"] = traceback.format_exception(*full_exc)
            log.exception("scan", "Error scanning %s" % filename, full_exc)
        else:
            eo["traceback"] = traceback.format_exception(*sys.exc_info())
            log.exception("scan", "Error scanning %s" % filename, sys.exc_info())
    else:
        log.warn("scan", "Warning scanning %s: %s" % (filename, xception))
    scan_errors.insert(0, eo)
    if len(scan_errors) > 100:
        scan_errors = scan_errors[0:100]
    cache.set_global("backend_scan_errors", scan_errors)


DELETE_OPERATION = (IN_DELETE, IN_MOVED_FROM)


class NewDirectoryException(Exception):
    pass


class DeletedDirectoryException(Exception):
    pass


class FileEventHandler(ProcessEvent):
    def process_IN_ATTRIB(self, event):
        # ATTRIB events are:
        # - Some file renames (see: WinSCP)
        # - Directories when they've been touched

        # ATTRIB on directories causes full station rescans when directories are copied to the root
        # of a station.  As such, we have to ignore these.
        if event.dir:
            log.debug("scan", "Ignoring attrib event for directory %s" % event.pathname)
            return

        self._process(event)

    def process_IN_CREATE(self, event):
        if event.dir:
            self._process(event)

    def process_IN_CLOSE_WRITE(self, event):
        if event.dir:
            log.debug(
                "scan", "Ignoring close write event for directory %s" % event.pathname
            )
            return
        self._process(event)

    def process_IN_DELETE(self, event):
        # Ignore WinSCP events.
        if event.pathname.endswith(".filepart"):
            return

        # Deletes are performed on files first, rendering a directory scan pointless.
        if event.dir:
            raise DeletedDirectoryException

        if not _is_mp3(event.pathname):
            log.debug("scan", "Ignoring delete event for non-MP3 %s" % event.pathname)
            return

        self._process(event)

    def process_IN_MOVED_TO(self, event):
        self._process(event)

        if event.dir:
            raise NewDirectoryException

    def process_IN_MOVED_FROM(self, event):
        if not event.dir and not _is_mp3(event.pathname):
            log.debug(
                "scan", "Ignoring moved-from event for non-MP3 %s" % event.pathname
            )
            return

        self._process(event)

    def process_IN_MOVED_SELF(self, event):
        raise DeletedDirectoryException

    def _process(self, event):
        # Ignore WinSCP events.
        if event.pathname.endswith(".filepart"):
            return

        try:
            matched_sids = []
            for song_dirs_path, sids in config.get("song_dirs").items():
                if event.pathname.startswith(song_dirs_path):
                    matched_sids.extend(sids)
        except Exception as xception:
            _add_scan_error(event.pathname, xception)

        log.debug("scan", "%s %s %s" % (event.maskname, event.pathname, matched_sids))

        try:
            if event.dir:
                _scan_directory(event.pathname, matched_sids)
            elif len(matched_sids) == 0 or event.mask in DELETE_OPERATION:
                _disable_file(event.pathname)
            else:
                _scan_file(event.pathname, matched_sids)
        except Exception as xception:
            _add_scan_error(event.pathname, xception)


def monitor():
    _common_init()

    mask = (
        pyinotify.IN_ATTRIB
        | pyinotify.IN_CREATE
        | pyinotify.IN_CLOSE_WRITE
        | pyinotify.IN_DELETE
        | pyinotify.IN_MOVED_TO
        | pyinotify.IN_MOVED_FROM
        | pyinotify.IN_MOVE_SELF
        | pyinotify.IN_EXCL_UNLINK
    )

    try:
        go = True
        while go:
            try:
                log.info("scan", "File monitor started.")
                wm = pyinotify.WatchManager()
                wm.add_watch(config.get("monitor_dir"), mask, rec=True, auto_add=True)
                pyinotify.Notifier(wm, FileEventHandler()).loop()
                go = False
            except NewDirectoryException:
                log.debug("scan", "New directory added, restarting watch.")
            except DeletedDirectoryException:
                log.debug("scan", "Directory was deleted, restarting watch.")
            finally:
                try:
                    wm.close()
                except:
                    pass
    finally:
        log.info("scan", "File monitor shutdown.")
