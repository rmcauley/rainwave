import os
import os.path
import time
import mimetypes
import sys
import asyncore
import psutil
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
_album_art_queue = None
_use_album_art_queue = False
mimetypes.init()

def start(full_scan = False, art_scan = False):
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

	if art_scan:
		full_art_update()
	elif full_scan:
		full_update()
	else:
		monitor()

def full_art_update():
	_scan_directories(album_art_only=True)

def full_update():
	global _use_album_art_queue
	global _album_art_queue

	cache.set("backend_scan", "full scan")
	db.c.update("UPDATE r4_songs SET song_scanned = FALSE")
	_album_art_queue = []
	_use_album_art_queue = True
	_scan_directories()

	print "\n",
	for i in range(0, len(_album_art_queue)):
		print "\rAlbum art: %s/%s" % (i + 1, len(_album_art_queue)),
		process_album_art(*_album_art_queue[i])
	_album_art_queue = []

	print "\nDisabling missing songs...",
	dead_songs = db.c.fetch_list("SELECT song_id FROM r4_songs WHERE song_scanned = FALSE AND song_verified = TRUE")
	for song_id in dead_songs:
		song = playlist.Song.load_from_id(song_id)
		song.disable()
	print "\rMissing songs disabled.   "
	print "Complete."

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

def _scan_directories(album_art_only = False):
	global _scan_errors
	global _directories

	if config.get("mp3gain_scan") and not playlist._mp3gain_path:
		raise Exception("mp3gain_scan flag in config is enabled, but could not find mp3gain executable.")

	leftovers = []
	for directory, sids in _directories.iteritems():
		total_files = 0
		file_counter = 0
		for root, subdirs, files in os.walk(directory.encode("utf-8"), followlinks = True):
			total_files += len(files)
		for root, subdirs, files in os.walk(directory.encode("utf-8"), followlinks = True):
			for filename in files:
				try:
					_scan_file(_fix_codepage_1252(filename, root), sids, throw_exceptions=True, album_art_only=album_art_only)
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

def _scan_file(filename, sids, throw_exceptions = False, album_art_only = False):
	log.debug("scan", "Scanning file: {}".format(filename))
	global _album_art_queue
	global _use_album_art_queue
	try:
		if _is_mp3(filename) and not album_art_only:
			# Only scan the file if we don't have a previous mtime for it, or the mtime is different
			old_mtime = db.c.fetch_var("SELECT song_file_mtime FROM r4_songs WHERE song_filename = %s AND song_verified = TRUE", (filename,))
			if not old_mtime or old_mtime != os.stat(filename)[8]:
				playlist.Song.load_from_file(filename, sids)
			else:
				db.c.update("UPDATE r4_songs SET song_scanned = TRUE WHERE song_filename = %s", (filename,))
		elif _is_image(filename):
			if _use_album_art_queue:
				_album_art_queue.append([filename, sids])
			else:
				process_album_art(filename, sids)
	except Exception as xception:
		_add_scan_error(filename, xception)
		if throw_exceptions:
			raise

def process_album_art(filename, sids):
	# There's an ugly bug here where psycopg isn't correctly escaping the path's \ on Windows
	# So we need to repr() in order to get the proper number of \ and then chop the leading and trailing single-quotes
	# Nasty bug.  This workaround needs to be tested on a POSIX system.
	try:
		if not config.get("album_art_enabled"):
			return True
		directory = repr(os.path.dirname(filename) + os.sep)[2:-1]
		album_ids = db.c.fetch_list("SELECT DISTINCT album_id FROM r4_songs JOIN r4_song_sid USING (song_id) WHERE song_filename LIKE %s || '%%'", (directory,))
		if not album_ids or len(album_ids) == 0:
			return False
		im_original = Image.open(filename)
		if im_original.mode != "RGB":
			im_original = im_original.convert()
		if not im_original:
			_add_scan_error(filename, "Could not open album art.")
			return False
		im_320 = im_original
		im_240 = im_original
		im_120 = im_original
		if im_original.size[0] > 420 or im_original.size[1] > 420:
			im_320 = im_original.copy()
			im_320.thumbnail((320, 320), Image.ANTIALIAS)
		if im_original.size[0] > 260 or im_original.size[1] > 260:
			im_240 = im_original.copy()
			im_240.thumbnail((240, 240), Image.ANTIALIAS)
		if im_original.size[0] > 160 or im_original.size[1] > 160:
			im_120 = im_original.copy()
			im_120.thumbnail((120, 120), Image.ANTIALIAS)
		for album_id in album_ids:
			im_120.save("%s/%s_%s_120.jpg" % (config.get("album_art_file_path"), sids[0], album_id))
			im_240.save("%s/%s_%s_240.jpg" % (config.get("album_art_file_path"), sids[0], album_id))
			im_320.save("%s/%s_%s.jpg" % (config.get("album_art_file_path"), sids[0], album_id))
			im_120.save("%s/%s_120.jpg" % (config.get("album_art_file_path"), album_id))
			im_240.save("%s/%s_240.jpg" % (config.get("album_art_file_path"), album_id))
			im_320.save("%s/%s.jpg" % (config.get("album_art_file_path"), album_id))
		return True
	except Exception as xception:
		_add_scan_error(filename, xception)
		return False

def _disable_file(filename):
	log.debug("scan", "Attempting to disable file: {}".format(filename))
	try:
		if _is_mp3(filename):
			song = playlist.Song.load_from_deleted_file(filename)
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
				_scan_file(_fix_codepage_1252(event.pathname), self.sids)
			except Exception as e:
				_add_scan_error(event.pathname, e)

		def process_IN_MOVED_FROM(self, event):
			self.process_IN_DELETE(event)

		def process_IN_MOVED_TO(self, event):
			self.process_IN_CREATE(event)

		def process_IN_CREATE(self, event):
			log.debug("scan", "Detected file creation {}".format(event.pathname))
			self._rw_process(event)

		def process_IN_CLOSE_WRITE(self, event):
			log.debug("scan", "Detected file modification {}".format(event.pathname))
			self._rw_process(event)

		def process_IN_DELETE(self, event):
			log.debug("scan", "Detected file deletion {}".format(event.pathname))
			_disable_file(event.pathname)

	pid = os.getpid()
	pid_file = open("%s/scanner.pid" % config.get("pid_dir"), 'w')
	pid_file.write(str(pid))
	pid_file.close()

	cache.set("backend_scan", "monitoring")
	mask = pyinotify.IN_DELETE | pyinotify.IN_CREATE | pyinotify.IN_MOVED_FROM | pyinotify.IN_MOVED_TO | pyinotify.IN_CLOSE_WRITE
	notifiers = []
	descriptors = []
	for dir, sids in _directories.iteritems():
		log.debug("scan", "Adding directory {} to watch list".format(dir))
		notifiers.append(pyinotify.AsyncNotifier(_wm, EventHandler(sids)))
		descriptors.append(_wm.add_watch(dir, mask, rec=True, auto_add=True))
	asyncore.loop()
	cache.set("backend_scan", "off")
