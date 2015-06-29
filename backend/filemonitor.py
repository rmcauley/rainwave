import os
import os.path
import time
from time import time as timestamp
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
# Art can be scanned before the music itself is scanned, in which case the art will
# have no home.  We need to account for that by using an album art queue.
# It's a hack, but a necessary one.
# We need a flag for immediate art because we don't want to worry about
# threads or mutexes on the array when monitoring.
immediate_art = True
_album_art_queue = []
mimetypes.init()

def _common_init():
	if config.get("mp3gain_scan") and not mp3gain_path:
		raise Exception("mp3gain_scan flag in config is enabled, but could not find mp3gain executable.")

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

	global immediate_art
	immediate_art = False

	try:
		if full_reset:
			db.c.update("UPDATE r4_songs SET song_file_mtime = 0")
		db.c.update("UPDATE r4_songs SET song_scanned = FALSE")

		_scan_all_directories()

		# This procedure is slow but steady and easy to use.
		dead_songs = db.c.fetch_list("SELECT song_id FROM r4_songs WHERE song_scanned = FALSE AND song_verified = TRUE")
		for song_id in dead_songs:
			song = playlist.Song.load_from_id(song_id)
			song.disable()

		_process_album_art_queue(on_screen=True)
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

def _scan_all_directories(art_only=False):
	total_files = 0
	file_counter = 0
	for directory, sids in config.get("song_dirs").iteritems():
		for root, subdirs, files in os.walk(directory.encode("utf-8"), followlinks = True):		#pylint: disable=W0612
			total_files += len(files)

	for directory, sids in config.get("song_dirs").iteritems():
		for root, subdirs, files in os.walk(directory.encode("utf-8"), followlinks = True):
			for filename in files:
				filename = os.path.normpath(root + os.sep + filename)
				try:
					if art_only and not _is_image(filename):
						pass
					else:
						_scan_file(filename, sids, raise_exceptions=True)
				except Exception as e:
					type_, value_, traceback_ = sys.exc_info()	#pylint: disable=W0612
					if not isinstance(e, PassableScanError):
						print "\n%s:\n\t %s: %s" % (filename.decode("utf-8", errors="ignore").encode("ascii", errors="ignore"), type_, value_)
					else:
						print "\n%s:\n\t %s" % (filename.decode("utf-8", errors="ignore").encode("ascii", errors="ignore"), value_)
						sys.stdout.flush()

				file_counter += 1
				_print_to_screen_inline('%s %s / %s' % (directory, file_counter, total_files))
				sys.stdout.flush()
		print "\n"
		sys.stdout.flush()

def _check_codepage_1252(filename):
	try:
		filename = filename.decode("utf-8")
	except UnicodeDecodeError:
		raise PassableScanError("Invalid filename. (possible cp1252 or obscure unicode)")

def _scan_directory(directory, sids):
	# Normalize and add a trailing separator to the directory name
	directory = os.path.join(os.path.normpath(directory), "")

	# Windows workaround eww, damnable directory names
	if os.name == "nt":
		directory = directory.replace("\\", "\\\\")

	songs = db.c.fetch_list("SELECT song_id FROM r4_songs WHERE song_filename LIKE %s || '%%' AND song_verified = TRUE", (directory,))
	for song_id in songs:
		# log.debug("scan", "Marking Song ID %s for possible deletion." % song_id)
		db.c.update("UPDATE r4_songs SET song_scanned = FALSE WHERE song_id = %s", (song_id,))

	do_scan = False
	try:
		os.stat(directory)
		do_scan = True
	except IOError:
		log.debug("scan", "Directory %s no longer exists." % directory)

	if do_scan:
		for root, subdirs, files in os.walk(directory, followlinks = True):	#pylint: disable=W0612
			for filename in files:
				filename = os.path.normpath(root + os.sep + filename)
				_scan_file(filename, sids)

	songs = db.c.fetch_list("SELECT song_id FROM r4_songs WHERE song_filename LIKE %s || '%%' AND song_scanned = FALSE AND song_verified = TRUE", (directory,))
	for song_id in songs:
		s = playlist.Song.load_from_id(song_id)
		log.debug("scan", "Disabling song: %s" % s.filename)
		s.disable()

def _scan_file(filename, sids, raise_exceptions=False):
	global _album_art_queue
	global immediate_art

	s = None
	try:
		_check_codepage_1252(filename)
	except Exception as e:
		_add_scan_error(filename, e)
		if raise_exceptions:
			raise
		return False
	if _is_mp3(filename):
		new_mtime = None
		try:
			new_mtime = os.stat(filename)[8]
		except IOError as e:
			_disable_file(filename)
		try:
			log.debug("scan", u"sids: {} Scanning file: {}".format(sids, filename))
			# Only scan the file if we don't have a previous mtime for it, or the mtime is different
			old_mtime = db.c.fetch_var("SELECT song_file_mtime FROM r4_songs WHERE song_filename = %s AND song_verified = TRUE", (filename,))
			if old_mtime != new_mtime or not old_mtime:
				log.debug("scan", "mtime mismatch, scanning for changes")
				s = playlist.Song.load_from_file(filename, sids)
				if not db.c.fetch_var("SELECT album_id FROM r4_songs WHERE song_id = %s", (s.id,)):
					_add_scan_error(s.filename, PassableScanError("%s was scanned but has no album ID." % s.filename))
					s.disable()
			else:
				log.debug("scan", "mtime match, no action taken.")
				db.c.update("UPDATE r4_songs SET song_scanned = TRUE WHERE song_filename = %s", (filename,))
		except Exception as e:
			_add_scan_error(filename, e)
			_disable_file(filename)
			if raise_exceptions:
				raise
	elif _is_image(filename):
		if not immediate_art:
			log.debug("scan", "Queueing art scan: %s" % filename)
			_album_art_queue.append([filename, sids])
		else:
			log.debug("scan", "Scanning art: %s" % filename)
			_process_album_art(filename, sids)
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
	if len(filetype) > 0 and filetype[0] and (filetype[0] == "audio/x-mpg" or filetype[0] == "audio/mpeg"):
		return True
	return False

def _is_image(filename):
	if _is_bad_extension(filename):
		return False

	filetype = mimetypes.guess_type(filename)
	if len(filetype) > 0 and filetype[0] and filetype[0].count("image") == 1:
		return True
	return False

def _process_album_art_queue(on_screen=False):
	global _album_art_queue
	for i in range(0, len(_album_art_queue)):
		if not _process_album_art(*_album_art_queue[i]) and on_screen:
			# print exception if there is one
			if sys.exc_info()[0]:
				type_, value_, traceback_ = sys.exc_info()	#pylint: disable=W0612
				print "\n%s:\n\t %s" % (_album_art_queue[i][0], value_)
				sys.stdout.flush()
		if on_screen:
			_print_to_screen_inline("Album art: %s/%s" % (i, len(_album_art_queue) - 1))
	if on_screen:
		print
	_album_art_queue = []

def _process_album_art(filename, sids):
	# Processes album art by finding the album IDs that are associated with the songs that exist
	# in the same directory as the image file.
	if not config.get("album_art_enabled"):
		return True
	try:
		# There's an ugly bug here where psycopg isn't correctly escaping the path's \ on Windows
		# So we need to repr() in order to get the proper number of \ and then chop the leading and trailing single-quotes
		# Nasty bug.  This workaround needs to be more thoroughly tested, admittedly, but appears to work fine on Linux as well.
		directory = repr(os.path.dirname(filename) + os.sep).strip("u'")
		album_ids = db.c.fetch_list("SELECT DISTINCT album_id FROM r4_songs WHERE song_filename LIKE %s || '%%'", (directory,))
		if not album_ids or len(album_ids) == 0:
			return
		im_original = Image.open(filename)
		if not im_original:
			raise IOError
		if im_original.mode != "RGB":
			im_original = im_original.convert()
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
			im_320.save("%s%s%s_%s_320.jpg" % (config.get("album_art_file_path"), os.sep, sids[0], album_id))
			im_120.save("%s%sa_%s_120.jpg" % (config.get("album_art_file_path"), os.sep, album_id))
			im_240.save("%s%sa_%s_240.jpg" % (config.get("album_art_file_path"), os.sep, album_id))
			im_320.save("%s%sa_%s_320.jpg" % (config.get("album_art_file_path"), os.sep, album_id))
		log.debug("album_art", "Scanned %s for album ID %s." % (filename, album_ids))
		return True
	except IOError:
		_add_scan_error(filename, PassableScanError("Could not open album art. (deleted file? bad image?)"))
		return False
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

def _add_scan_error(filename, xception):
	scan_errors = cache.get("backend_scan_errors")
	if not scan_errors:
		scan_errors = []

	scan_errors.insert(0, { "time": int(timestamp()), "file": filename, "type": xception.__class__.__name__, "error": str(xception) })
	if len(scan_errors) > 100:
		scan_errors = scan_errors[0:100]
	cache.set("backend_scan_errors", scan_errors)
	log.exception("scan", "Error scanning %s" % filename, xception)

class FileEventHandler(watchdog.events.FileSystemEventHandler):
	def __init__(self, root_directory, sids):
		self.root_directory = root_directory
		self.sids = sids

	def _handle_file(self, filename):
		try:
			_scan_file(filename, self.sids)
		except Exception as xception:
			_add_scan_error(filename, xception)

	def _handle_directory(self, directory):
		try:
			_scan_directory(directory, self.sids)
		except Exception as xception:
			_add_scan_error(directory, xception)

	def _handle_event(self, event):
		try:
			if hasattr(event, "src_path") and event.src_path and check_file_is_in_directory(event.src_path, self.root_directory):
				if _is_bad_extension(event.src_path):
					pass
				elif not os.path.isdir(event.src_path):
					log.debug("scan_event", "%s src_path for file %s" % (event.event_type, event.src_path))
					if _is_image(event.src_path) and (event.event_type == 'deleted' or event.event_type == 'moved'):
						pass
					else:
						self._handle_file(event.src_path)
				else:
					log.debug("scan_event", "%s src_path for dir %s" % (event.event_type, event.src_path))
					self._handle_directory(event.src_path)

			if hasattr(event, "dest_path") and event.dest_path and check_file_is_in_directory(event.dest_path, self.root_directory):
				if _is_bad_extension(event.dest_path):
					pass
				elif not os.path.isdir(event.dest_path):
					log.debug("scan_event", "%s dest_path for file %s" % (event.event_type, event.dest_path))
					if _is_image(event.dest_path) and (event.event_type == 'deleted'):
						pass
					else:
						self._handle_file(event.dest_path)
				else:
					log.debug("scan_event", "%s dest_path for dir %s" % (event.event_type, event.dest_path))
					self._handle_directory(event.dest_path)
		except Exception as xception:
			_add_scan_error(self.root_directory, xception)
			log.critical("scan_event", "Exception occurred - reconnecting to the database just in case.")
			db.close()
			db.connect()

	def on_moved(self, event):
		self._handle_event(event)

	def on_created(self, event):
		self._handle_event(event)

	def on_deleted(self, event):
		self._handle_event(event)

	def on_modified(self, event):
		self._handle_event(event)

class RWObserver(watchdog.observers.Observer):
	def start(self, *args, **kwargs):
		super(RWObserver, self).start(*args, **kwargs)
		db.connect()
		cache.connect()

	def stop(self, *args, **kwargs):
		super(RWObserver, self).stop(*args, **kwargs)
		db.close()

def monitor():
	_common_init()

	pid = os.getpid()
	pid_file = open("%s/scanner.pid" % config.get_directory("pid_dir"), 'w')
	pid_file.write(str(pid))
	pid_file.close()

	observers = []
	for directory, sids in config.get("song_dirs").iteritems():
		observer = RWObserver()
		observer.schedule(FileEventHandler(directory, sids), directory, recursive=True)
		observer.start()
		log.info("scan", "Observing %s with sids %s" % (directory, repr(sids)))
		observers.append(observer)

	try:
		while True:
			time.sleep(1)
	finally:
		for observer in observers:
			observer.stop()
		for observer in observers:
			observer.join()
