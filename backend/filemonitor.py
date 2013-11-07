import os
import os.path
import time
import mimetypes
import sys
import asyncore
import psutil
import shutil
from PIL import Image

_wm = None
if os.name != "nt":
	import pyinotify
	_wm = pyinotify.WatchManager()

from libs import config
from libs import log
from libs import cache
from libs import db

from rainwave import playlist

_directories = {}
_scan_errors = None
mimetypes.init()

def start(full_scan):
	global _directories
	global _scan_errors

	_scan_errors = cache.get("backend_scan_errors")
	if not _scan_errors:
		_scan_errors = []
	_directories = config.get("song_dirs")

	if os.name != "nt":
		p = psutil.Process(os.getpid())
		p.set_nice(10)
		p.set_ionice(psutil.IOPRIO_CLASS_IDLE)

	if full_scan:
		full_update()
	else:
		monitor()

def full_update():
	cache.set("backend_scan", "full scan")
	db.c.update("UPDATE r4_songs SET song_scanned = FALSE")
	_scan_directories()

	dead_songs = db.c.fetch_list("SELECT song_id FROM r4_songs WHERE song_scanned = FALSE AND song_verified = TRUE")
	for song_id in dead_songs:
		song = playlist.Song.load_from_id(song_id)
		song.disable()

	cache.set("backend_scan", "off")

def _fix_codepage_1252(filename, path = None):
	fqfn = filename
	if path:
		fqfn = os.path.normpath(path + os.sep + filename)
	try:
		fqfn = fqfn.decode("utf-8")
	except UnicodeDecodeError:
		if config.get("scanner_rename_files"):
			try:
				os.rename(fqfn, fqfn.decode("utf-8", errors="ignore"))
				fqfn = fqfn.decode("utf-8", errors="ignore")
			except OSError as e:
				new_e = Exception("Permissions or file error renaming non-UTF-8 filename.  Please rename or fix permissions.")
				_add_scan_error(fqfn.decode("utf-8", errors="ignore"), new_e)
				raise new_e
			except Exception as e:
				_add_scan_error(fqfn.decode("utf-8", errors="ignore"), e)
				raise
		else:
			raise
	except Exception as e:
		_add_scan_error(fqfn.decode("utf-8", errors="ignore"), e)
		raise
	return fqfn

def _scan_directories():
	global _scan_errors
	global _directories

	leftovers = []
	for directory, sids in _directories.iteritems():
		total_files = 0
		file_counter = 0
		for root, subdirs, files in os.walk(directory.encode("utf-8"), followlinks = True):
			total_files += len(files)
		for root, subdirs, files in os.walk(directory.encode("utf-8"), followlinks = True):
			for filename in files:
				try:
					_scan_file(_fix_codepage_1252(filename, root), sids)
				except Exception as e:
					type_, value_, traceback_ = sys.exc_info()
					print "\r%s: %s" % (filename.decode("utf-8", errors="ignore"), value_)
				file_counter += 1
				print '\r%s %s / %s' % (directory, file_counter, total_files),
				sys.stdout.flush()
	_save_scan_errors()

def _is_mp3(filename):
	filetype = mimetypes.guess_type(filename)
	if len(filetype) > 0 and filetype[0] and (filetype[0] == "audio/x-mpg" or filetype[0] == "audio/mpeg"):
		return True
	return False

def _is_image(filename):
	filetype = mimetypes.guess_type(filename)
	if len(filetype) > 0 and filetype[0] and filetype[0].count("image") == 1:
		return True
	return False

def _scan_file(filename, sids, throw_exceptions = False):
	try:
		if _is_mp3(filename):
			# Only scan the file if we don't have a previous mtime for it, or the mtime is different
			old_mtime = db.c.fetch_var("SELECT song_file_mtime FROM r4_songs WHERE song_filename = %s AND song_verified = TRUE", (filename,))
			if not old_mtime or old_mtime != os.stat(filename)[8]:
				playlist.Song.load_from_file(filename, sids)
			elif old_mtime:
				db.c.update("UPDATE r4_songs SET song_scanned = TRUE WHERE song_filename = %s", (filename,))
		elif _is_image(filename):
			process_album_art(filename)
	except Exception as xception:
		_add_scan_error(filename, xception)
		if throw_exceptions:
			raise

def process_album_art(filename):
	# There's an ugly bug here where psycopg isn't correctly escaping the path's \ on Windows
	# So we need to repr() in order to get the proper number of \ and then chop the leading and trailing single-quotes
	# Nasty bug.  This workaround needs to be tested on a POSIX system.
	if not config.get("album_art_enabled"):
		return True
	directory = repr(os.path.dirname(filename))[2:-1]
	album_ids = db.c.fetch_list("SELECT DISTINCT album_id FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE song_filename LIKE %s || '%%'", (directory,))
	if not album_ids or len(album_ids) == 0:
		return False
	im_original = Image.open(filename)
	if not im_original:
		_add_scan_error(filename, "Could not open album art.")
		return False
	process_image = False
	if im_original.size[0] > 640 or im_original.size[1] > 640:
		im_original.thumbnail((640, 640), Image.ANTIALIAS)
		process_image = True
	if mimetypes.guess_type(filename) != "image/jpeg":
		process_image = True
	if process_image:
		for album_id in album_ids:
			im_original.save("%s/%s.jpg" % (config.get("album_art_file_path"), album_id))
	else:
		for album_id in album_ids:
			shutil.copy(filename, "%s/%s.jpg" % (config.get("album_art_file_path"), album_id))
	return True

def _disable_file(filename):
	try:
		if _is_mp3(filename):
			song = playlist.Song.load_from_file(filename, [])
			song.disable()
	except Exception as xception:
		_add_scan_error(filename, xception)

def _add_scan_error(filename, xception):
	global _scan_errors

	_scan_errors.insert(0, { "time": int(time.time()), "file": filename, "type": xception.__class__.__name__, "error": str(xception) })
	log.exception("scan", "Error scanning %s" % filename, xception)

	if config.test_mode:
		raise xception

def _save_scan_errors():
	global _scan_errors

	if len(_scan_errors) > 100:
		_scan_errors = _scan_errors[0:100]
	cache.set("backend_scan_errors", _scan_errors)

def monitor():
	global _wm
	if not _wm:
		raise "Cannot monitor on Windows, or without pyinotify."

	class EventHandler(pyinotify.ProcessEvent):
		def __init__(self, sids):
			self.sids = sids

		def _rw_process(self, event):
			try:
				_scan_file(_fix_codepage_1252(event.pathname, self.sids))
			except Exception as e:
				_add_scan_error(filename, e)

		def process_IN_CREATE(self, event):
			self._rw_process(event)

		def process_IN_MODIFY(self, event):
			self._rw_process(event)

		def process_IN_DELETE(self, event):
			_disable_file(event.pathname)

	cache.set("backend_scan", "monitoring")
	mask = pyinotify.IN_DELETE | pyinotify.IN_CREATE | pyinotify.IN_MODIFY
	notifiers = []
	descriptors = []
	for dir, sids in _directories.iteritems():
		notifiers.append(pyinotify.AsyncNotifier(_wm, EventHandler(sids)))
		descriptors.append(_wm.add_watch(dir, mask, rec=True, auto_add=True))
	print "Monitoring"
	asyncore.loop()
	cache.set("backend_scan", "off")
