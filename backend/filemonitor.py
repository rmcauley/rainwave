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

from libs.filetools import check_file_is_in_directory, which

mp3gain_path = which("mp3gain")
# Scan errors is pulled from/pushed to cache and is not saved to db.
_scan_errors = None
# Art can be scanned before the music itself is scanned, in which case the art will
# have no home.  We need to account for that by using an album art queue.
# It's a hack, but a necessary one.
_album_art_queue = []
mimetypes.init()

def _common_init():
	if config.get("mp3gain_scan") and not mp3gain_path:
		raise Exception("mp3gain_scan flag in config is enabled, but could not find mp3gain executable.")

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

def full_music_scan():
	_common_init()
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

def full_art_update():
	global _art_only
	_common_init()
	_scan_all_directories(art_only=True)
	_process_album_art_queue(on_screen=True)

def _print_to_screen_inline(txt):
	txt += " " * (80 - len(txt))
	print "\r" + txt,

def _scan_all_directories(art_only=True):
	# This function loops through all directories and 

	global _scan_errors

	# Grab count of all files
	total_files = 0
	file_counter = 0
	for directory, sids in config.get("song_dirs").iteritems():
		for root, subdirs, files in os.walk(directory.encode("utf-8"), followlinks = True):
			total_files += len(files)

	for directory, sids in config.get("song_dirs").iteritems():		
		for root, subdirs, files in os.walk(directory.encode("utf-8"), followlinks = True):
			for filename in files:
				try:
					if art_only and not _is_image(_check_codepage_1252(filename, root)):
						pass
					else:
						_scan_file(_check_codepage_1252(filename, root), sids)
				except Exception as e:
					type_, value_, traceback_ = sys.exc_info()
					if not isinstance(e, PassableScanError):
						print
						print "*****************"
						print "UNKNOWN ERROR WHILE SCANNING"
						print os.path.join(root, filename)
						print "*****************"
						_add_scan_error(filename, "Fatal error: %s - %s" % (type_, value_))
						raise
					else:
						_add_scan_error(filename, value_)
						print "\n%s:\n\t %s" % (filename.decode("utf-8", errors="ignore"), value_)
						sys.stdout.flush()

				file_counter += 1
				_print_to_screen_inline('%s %s / %s' % (directory, file_counter, total_files))
				sys.stdout.flush()
		print "\n"
		sys.stdout.flush()

def _check_codepage_1252(filename, path = None):
	fqfn = filename
	if path:
		fqfn = os.path.normpath(path + os.sep + filename)
	
	try:
		fqfn = fqfn.decode("utf-8")
	except UnicodeDecodeError as e:
		raise PassableScanError("Invalid filename. (possible cp1252 or obscure unicode)")
	return fqfn

def _scan_file(filename, sids):
	global _album_art_queue

	try:
		if _is_mp3(filename):
			log.debug("scan", u"sids: {} Scanning file: {}".format(sids, filename))
			# Only scan the file if we don't have a previous mtime for it, or the mtime is different
			old_mtime = db.c.fetch_var("SELECT song_file_mtime FROM r4_songs WHERE song_filename = %s AND song_verified = TRUE", (filename,))
			if not old_mtime or old_mtime != os.stat(filename)[8]:
				# log.debug("scan", "mtime mismatch, scanning for changes")
				s = playlist.Song.load_from_file(filename, sids)
				if not db.c.fetch_var("SELECT album_id FROM r4_songs WHERE song_id = %s", (s.id,)):
					_add_scan_error(s.filename, "%s was scanned but has no album ID." % s.filename)
					s.disable()
			else:
				# log.debug("scan", "mtime match, no action taken")
				db.c.update("UPDATE r4_songs SET song_scanned = TRUE WHERE song_filename = %s", (filename,))
		elif _is_image(filename):
			_album_art_queue.append([filename, sids])
	except IOError as e:
		raise PassableScanError("IOError: possibly permissions or bad filename.")

def _is_mp3(filename):
	# ignore mp3gain temporary files
	if filename.lower().endswith(".tmp"):
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

def _process_album_art_queue(on_screen=False):
	global _album_art_queue
	for i in range(0, len(_album_art_queue)):
		try:
			_process_album_art(*_album_art_queue[i])
		except Exception as e:
			type_, value_, traceback_ = sys.exc_info()
			_add_scan_error(_album_art_queue[i][0], e)
			if on_screen:
				print "\n%s:\n\t %s" % (_album_art_queue[i][0], value_)
				sys.stdout.flush()
		if on_screen:
			_print_to_screen_inline("Album art: %s/%s" % (i, len(_album_art_queue)))
	_album_art_queue = []

def _process_album_art(filename, sids):
	# Processes album art by finding the album IDs that are associated with the songs that exist
	# in the same directory as the image file.
	if not config.get("album_art_enabled"):
		return True
	# There's an ugly bug here where psycopg isn't correctly escaping the path's \ on Windows
	# So we need to repr() in order to get the proper number of \ and then chop the leading and trailing single-quotes
	# Nasty bug.  This workaround needs to be more thoroughly tested, admittedly, but appears to work fine on Linux as well.
	directory = repr(os.path.dirname(filename) + os.sep)[2:-1]
	album_ids = db.c.fetch_list("SELECT album_id FROM r4_songs WHERE song_filename LIKE %s || '%%'", (directory,))
	if not album_ids or len(album_ids) == 0:
		return
	im_original = Image.open(filename)
	if im_original.mode != "RGB":
		im_original = im_original.convert()
	if not im_original:
		_add_scan_error(filename, "Could not open album art.")
		return
	im_320 = im_original
	im_240 = im_original
	im_120 = im_original
	if im_original.size[0] > 420 or im_original.size[1] > 420:
		im_320 = im_original.copy()
		im_320.thumbnail((320, 320), Image.ANTIALIAS)
	if im_original.size[0] > 240 or im_original.size[1] > 240:
		im_240 = im_original.copy()
		im_240.thumbnail((240, 240), Image.ANTIALIAS)
	if im_original.size[0] > 160 or im_original.size[1] > 160:
		im_120 = im_original.copy()
		im_120.thumbnail((120, 120), Image.ANTIALIAS)
	for album_id in album_ids:
		im_120.save("%s%s%s_%s_120.jpg" % (config.get("album_art_file_path"), os.sep, sids[0], album_id))
		im_240.save("%s%s%s_%s_240.jpg" % (config.get("album_art_file_path"), os.sep, sids[0], album_id))
		im_320.save("%s%s%s_%s.jpg" % (config.get("album_art_file_path"), os.sep, sids[0], album_id))
		im_120.save("%s%s%s_120.jpg" % (config.get("album_art_file_path"), os.sep, album_id))
		im_240.save("%s%s%s_240.jpg" % (config.get("album_art_file_path"), os.sep, album_id))
		im_320.save("%s%s%s.jpg" % (config.get("album_art_file_path"), os.sep, album_id))

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
	global _scan_errors

	_scan_errors.insert(0, { "time": int(time.time()), "file": filename, "type": xception.__class__.__name__, "error": str(xception) })
	_save_scan_errors()
	log.exception("scan", "Error scanning %s" % filename, xception)

def _save_scan_errors():
	global _scan_errors

	if len(_scan_errors) > 100:
		_scan_errors = _scan_errors[0:100]
	cache.set("backend_scan_errors", _scan_errors)

class FileEventHandler(watchdog.events.FileSystemEventHandler):
	def __init__(self, root_directory, sids):
		self.root_directory = root_directory
		self.sids = sids

	def _handle_file(self, filename):
		# log.debug("scanner", u"Scanning file: %s" % filename)
		try:
			_scan_file(_check_codepage_1252(filename), self.sids)
		except Exception as e:
			type_, value_, traceback_ = sys.exc_info()
			if not isinstance(e, PassableScanError):
				_add_scan_error(filename, "%s - %s" % (type_, value_))
			else:
				_add_scan_error(filename, value_)
				_print_to_screen_inline("%s:\n\t %s" % (filename.decode("utf-8", errors="ignore"), value_))
				sys.stdout.flush()

	def _src_path_handler(self, event):
		if not event.is_directory:
			self._handle_file(event.src_path)

	def _dest_path_handler(self, event):
		if not event.is_directory:
			self.handle_file(event.dest_path)

	def on_moved(self, event):
		if check_file_is_in_directory(event.src_path, self.root_directory):
			log.debug("scan", "Root dir %s handling src path move: %s" % (self.root_directory, event.src_path))
			self._src_path_handler(event)

		if check_file_is_in_directory(event.dest_path, self.root_directory):
			log.debug("scan", "Root dir %s handling dest path move: %s" % (self.root_directory, event.dest_path))
			self._dest_path_handler(event)

	def on_created(self, event):
		self._src_path_handler(event)

	def on_deleted(self, event):
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
	except Exception as e:
		log.exception("scan", "Exception leaked to top monitoring function.", e)
		for observer in observers:
			observer.stop()
	for observer in observers:
		observer.join()
