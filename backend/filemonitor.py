import os
import os.path
import time
import mimetypes
import sys
import psutil
import watchdog.events
import watchdog.observers
from PIL import Image

from libs import config
from libs import log
from libs import cache
from libs import db

from rainwave import playlist
from rainwave.playlist_objects.song import PassableScanError

from libs import filetools

mp3gain_path = filetools.which("mp3gain")
# Scan errors is pulled from/pushed to cache and is not saved to db.
_scan_errors = None
# Art can be scanned before the music itself is scanned, in which case the art will
# have no home.  We need to account for that by using an album art queue.
# It's a hack, but a necessary one.
_album_art_queue = []
# A flag that's easier than passing around an argument a million times
_art_only = False
_raise_scan_errors = False
mimetypes.init()
invalid_filename_characters = (":", )
invalid_characters = ("?", )

def full_art_update():
	global _art_only
	_art_only = True
	_common_init()
	_scan_all_directories()
	_art_only = False
	_process_album_art_queue()

def full_music_scan():
	global _raise_scan_errors

	_common_init()
	_raise_scan_errors = True
	db.c.start_transaction()
	try:
		db.c.update("UPDATE r4_songs SET song_scanned = FALSE")

		_scan_all_directories()

		# This procedure is slow but steady and easy to use.
		dead_songs = db.c.fetch_list("SELECT song_id FROM r4_songs WHERE song_scanned = FALSE AND song_verified = TRUE")
		for song_id in dead_songs:
			song = playlist.Song.load_from_id(song_id)
			song.disable()

		print "Processing album art..."
		_process_album_art_queue()
		print "Complete."
		db.c.commit()
	except:
		db.c.rollback()
		raise

def _common_init():
	global _scan_errors
	_scan_errors = cache.get("backend_scan_errors")
	if not _scan_errors:
		_scan_errors = []

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

def _scan_all_directories():
	for directory, sids in config.get("song_dirs").iteritems():
		_scan_directory(directory, sids, toscreen=True)

def _scan_directory(directory, sids, toscreen=False):
	# Scans all directories.  THIS FUNCTION IS NOT TO BE CALLED RECURSIVELY.
	# The walk happens within the single function!
	global _scan_errors

	if config.get("mp3gain_scan") and not mp3gain_path:
		raise Exception("mp3gain_scan flag in config is enabled, but could not find mp3gain executable.")

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
				if toscreen and not isinstance(e, UnicodeDecodeError) and not isinstance(e, PassableScanError):
					print "\n%s" % filename
					raise
				elif toscreen:
					debug_line = "%s:\n\t %s" % (filename.decode("utf-8", errors="ignore"), value_)
					debug_line += " " * (80 - len(debug_line))
					print "\r" + (" " * 80)
					print debug_line
			file_counter += 1
			if toscreen:
				print '\r%s %s / %s' % (directory, file_counter, total_files),
			sys.stdout.flush()
	if toscreen:
		print "\n"
	sys.stdout.flush()
	_save_scan_errors()

def _is_mp3(filename):
	# ignore mp3gain temporary files
	if filename.endswith(".TMP"):
		return False
	filetype = mimetypes.guess_type(filename)
	if len(filetype) > 0 and filetype[0] and (filetype[0] == "audio/x-mpg" or filetype[0] == "audio/mpeg"):
		return True
	return False

def _is_image(filename):
	filetype = mimetypes.guess_type(filename)
	if len(filetype) > 0 and filetype[0] and filetype[0].count("image") == 1:
		return True
	return False

def _fix_codepage_1252(filename, path = None):
	# Goddamned codepage 1252 and its stupid crap mucking up my filenames.
	# The streaming program hates anything not ASCII or UTF-8 when reading in filenames,
	# so this function strips non-ASCII characters out of the filename.

	global invalid_characters

	fqfn = filename
	if path:
		fqfn = os.path.normpath(path + os.sep + filename)

	if True in [c in filename for c in invalid_filename_characters] or True in [c in fqfn for c in invalid_characters]:
		# This ensures that the stack trace stays intact for this moment
		# and other times that _add_scan_error gets called.
		try:
			raise PassableScanError("Invalid filename.")
		except Exception as e:
			_add_scan_error(fqfn.decode("utf-8", errors="ignore"), e)

	try:
		fqfn = fqfn.decode("utf-8")
	except UnicodeDecodeError as unidecode_e:
		if config.get("scanner_rename_files"):
			try:
				os.rename(fqfn, fqfn.decode("utf-8", errors="ignore"))
				fqfn = fqfn.decode("utf-8", errors="ignore")
			except OSError as e:
				new_e = PassableScanError("Permissions or file error renaming non-UTF-8 filename.  Please rename or fix permissions.")
				_add_scan_error(fqfn.decode("utf-8", errors="ignore"), new_e)
			except Exception as e:
				_add_scan_error(fqfn.decode("utf-8", errors="ignore"), e)
		else:
			_add_scan_error(fqfn.decode("utf-8", errors="ignore"), unidecode_e)
	except Exception as e:
		_add_scan_error(fqfn.decode("utf-8", errors="ignore"), e)
	return fqfn

def _scan_file(filename, sids):
	# log.debug("scan", u"sids: {} Scanning file: {}".format(sids, filename))
	global _album_art_queue
	global _art_only

	try:
		if _is_mp3(filename) and not _art_only:
			# Only scan the file if we don't have a previous mtime for it, or the mtime is different
			old_mtime = db.c.fetch_var("SELECT song_file_mtime FROM r4_songs WHERE song_filename = %s AND song_verified = TRUE", (filename,))
			if not old_mtime or old_mtime != os.stat(filename)[8]:
				# log.debug("scan", "mtime mismatch, scanning for changes")
				playlist.Song.load_from_file(filename, sids)
			else:
				# log.debug("scan", "mtime match, no action taken")
				db.c.update("UPDATE r4_songs SET song_scanned = TRUE WHERE song_filename = %s", (filename,))
		elif _is_image(filename):
			_album_art_queue.append([filename, sids])
	except Exception as xception:
		_add_scan_error(filename, xception)

def _process_album_art_queue():
	global _album_art_queue
	for i in range(0, len(_album_art_queue)):
		_process_album_art(*_album_art_queue[i])
	_album_art_queue = []

def _process_album_art(filename, sids):
	# Processes album art by finding the album IDs that are associated with the songs that exist
	# in the same directory as the image file.
	try:
		if not config.get("album_art_enabled"):
			return True
		# There's an ugly bug here where psycopg isn't correctly escaping the path's \ on Windows
		# So we need to repr() in order to get the proper number of \ and then chop the leading and trailing single-quotes
		# Nasty bug.  This workaround needs to be more thoroughly tested, admittedly, but appears to work fine on Linux as well.
		directory = repr(os.path.dirname(filename) + os.sep)[2:-1]
		album_ids = db.c.fetch_list("SELECT album_id FROM r4_songs WHERE song_filename LIKE %s || '%%'", (directory,))
		if not album_ids or len(album_ids) == 0:
			return False
		im_original = Image.open(filename)
		if im_original.mode != "RGB":
			im_original = im_original.convert()
		if not im_original:
			_add_scan_error(filename, "Could not open album art.")
			return False
		im_320 = im_original
		im_120 = im_original
		if im_original.size[0] > 420 or im_original.size[1] > 420:
			im_320 = im_original.copy()
			im_320.thumbnail((320, 320), Image.ANTIALIAS)
		if im_original.size[0] > 160 or im_original.size[1] > 160:
			im_120 = im_original.copy()
			im_120.thumbnail((120, 120), Image.ANTIALIAS)
		for album_id in album_ids:
			im_120.save("%s/%s_%s_120.jpg" % (config.get("album_art_file_path"), sids[0], album_id))
			im_320.save("%s/%s_%s.jpg" % (config.get("album_art_file_path"), sids[0], album_id))
			im_120.save("%s/%s_120.jpg" % (config.get("album_art_file_path"), album_id))
			im_320.save("%s/%s.jpg" % (config.get("album_art_file_path"), album_id))
		return True
	except Exception as xception:
		_add_scan_error(filename, xception)
		return False

def _disable_file(filename):
	# aka "delete this off the playlist"
	log.debug("scan", "Attempting to disable file: {}".format(filename))
	try:
		if _is_mp3(filename):
			song = playlist.Song.load_from_deleted_file(filename)
			song.disable()
	except Exception as xception:
		_add_scan_error(filename, xception)

def _add_scan_error(filename, xception):
	global _scan_errors, _raise_scan_errors

	_scan_errors.insert(0, { "time": int(time.time()), "file": filename, "type": xception.__class__.__name__, "error": str(xception) })
	_save_scan_errors()
	log.exception("scan", "Error scanning %s" % filename, xception)

	if config.test_mode or _raise_scan_errors:
		raise

def _save_scan_errors():
	global _scan_errors

	if len(_scan_errors) > 100:
		_scan_errors = _scan_errors[0:100]
	cache.set("backend_scan_errors", _scan_errors)

class FileEventHandler(watchdog.events.FileSystemEventHandler):
	def __init__(self, root_directory, sids):
		self.root_directory = root_directory
		self.sids = sids

	def _handle_directory(self, directory):
		log.debug("scanner", u"Scanning directory: %s" % directory)
		_scan_directory(directory, self.sids)

	def _handle_file(self, filename):
		log.debug("scanner", u"Scanning file: %s" % filename)
		_scan_file(_fix_codepage_1252(filename), self.sids)

	def _src_path_handler(self, event):
		if event.is_directory:
			self._handle_directory(event.src_path)
		else:
			self._handle_file(event.src_path)

	def on_moved(self, event):
		if event.is_directory:
			self._handle_directory(event.dest_path)
		else:
			self._handle_file(event.dest_path)

	def on_created(self, event):
		# We don't need to scan empty directories
		# New files are automatically reported after the new directory call anyway
		if not event.is_directory:
			self._src_path_handler(event)

	def on_deleted(self, event):
		# Unlike on_created, on_deleted will ONLY report a folder delete.
		# It will not report every file inside that directory as deleted.
		self._src_path_handler(event)

	def on_modified(self, event):
		self._src_path_handler(event)

def monitor():
	_common_init()

	pid = os.getpid()
	pid_file = open("%s/scanner.pid" % config.get_directory("pid_dir"), 'w')
	pid_file.write(str(pid))
	pid_file.close()

	observers = []
	for directory, sids in config.get("song_dirs").iteritems():
		observer = watchdog.observers.Observer()
		observer.schedule(FileEventHandler(directory, sids), directory, recursive=True)
		observer.start()
		observers.append(observer)

	try:
		while True:
			time.sleep(60)
			_process_album_art_queue()
	except:
		for observer in observers:
			observer.stop()
	for observer in observers:
		observer.join()
