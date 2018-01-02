# -*- coding: utf-8 -*-

from __future__ import unicode_literals

import os
import os.path
import time
from time import time as timestamp
import mimetypes
import sys
import psutil
import pyinotify
import traceback
from PIL import Image

from libs import config
from libs import log
from libs import cache
from libs import db

from rainwave import playlist
from rainwave.playlist_objects.song import PassableScanError

from libs.filetools import which

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
				if art_only and not _is_image(filename):
					pass
				else:
					_scan_file(filename, sids)
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
	except (IOError, OSError):
		log.debug("scan", "Directory %s no longer exists." % directory)

	if do_scan and len(sids) > 0:
		for root, subdirs, files in os.walk(directory, followlinks = True):	#pylint: disable=W0612
			for filename in files:
				filename = os.path.normpath(root + os.sep + filename)
				_scan_file(filename, sids)

	songs = db.c.fetch_list("SELECT song_id FROM r4_songs WHERE song_filename LIKE %s || '%%' AND song_scanned = FALSE AND song_verified = TRUE", (directory,))
	for song_id in songs:
		s = playlist.Song.load_from_id(song_id)
		log.debug("scan", "Disabling song: %s" % s.filename)
		s.disable()

def _scan_file(filename, sids):
	global _album_art_queue
	global immediate_art

	s = None
	try:
		_check_codepage_1252(filename)
	except Exception as e:
		_add_scan_error(filename, e, sys.exc_info())
	if _is_mp3(filename):
		new_mtime = None
		try:
			new_mtime = os.stat(filename)[8]
		except IOError as e:
			_add_scan_error(filename, e)
			_disable_file(filename)
		except OSError as e:
			_add_scan_error(filename, e)
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
		except IOError as e:
			_add_scan_error(filename, e)
			_disable_file(filename)
		except OSError as e:
			_add_scan_error(filename, e)
			_disable_file(filename)
		except Exception as e:
			_add_scan_error(filename, e, sys.exc_info())
			_disable_file(filename)
	elif _is_image(filename):
		if not immediate_art:
			#log.debug("scan", "Queueing art scan: %s" % filename)
			_album_art_queue.append([filename, sids])
		else:
			#log.debug("scan", "Scanning art: %s" % filename)
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
		directory = repr(os.path.dirname(filename) + os.sep).strip("u'\"")
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
		if im_original.size[0] < 320 or im_original.size[1] < 320:
			_add_scan_error(filename, PassableScanError("Small Art Warning: %sx%s" % (im_original.size[0], im_original.size[1])))
		for album_id in album_ids:
			im_120.save("%s%s%s_%s_120.jpg" % (config.get("album_art_file_path"), os.sep, sids[0], album_id))
			im_240.save("%s%s%s_%s_240.jpg" % (config.get("album_art_file_path"), os.sep, sids[0], album_id))
			im_320.save("%s%s%s_%s_320.jpg" % (config.get("album_art_file_path"), os.sep, sids[0], album_id))
			im_120.save("%s%sa_%s_120.jpg" % (config.get("album_art_file_path"), os.sep, album_id))
			im_240.save("%s%sa_%s_240.jpg" % (config.get("album_art_file_path"), os.sep, album_id))
			im_320.save("%s%sa_%s_320.jpg" % (config.get("album_art_file_path"), os.sep, album_id))
		log.debug("album_art", "Scanned %s for album ID %s." % (filename, album_ids))
		return True
	except (IOError, OSError):
		_add_scan_error(filename, PassableScanError("Could not open album art. (this will happen when a directory has been deleted)"))
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

def _add_scan_error(filename, xception, full_exc=None):
	scan_errors = []
	try:
		scan_errors = cache.get("backend_scan_errors")
	except:
		pass
	if not scan_errors:
		scan_errors = []

	eo = { "time": int(timestamp()), "file": filename, "type": xception.__class__.__name__, "error": str(xception), "traceback": "" }
	if not isinstance(xception, PassableScanError) and not isinstance(xception, IOError) and not isinstance(xception, OSError):
		if full_exc:
			eo['traceback'] = traceback.format_exception(*full_exc)			#pylint: disable=W0142
			log.exception("scan", "Error scanning %s" % filename, full_exc)
		else:
			eo['traceback'] = traceback.format_exception(*sys.exc_info())
			log.exception("scan", "Error scanning %s" % filename, sys.exc_info())
	else:
		log.warn("scan", "Warning scanning %s: %s" % (filename, xception.message))
	scan_errors.insert(0, eo)
	if len(scan_errors) > 100:
		scan_errors = scan_errors[0:100]
	cache.set("backend_scan_errors", scan_errors)

DELETE_OPERATION = (pyinotify.IN_DELETE, pyinotify.IN_MOVED_FROM)

class NewDirectoryException(Exception):
	pass

class DeletedDirectoryException(Exception):
	pass

class FileEventHandler(pyinotify.ProcessEvent):
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
			raise NewDirectoryException

	def process_IN_CLOSE_WRITE(self, event):
		if event.dir:
			log.debug("scan", "Ignoring close write event for directory %s" % event.pathname)
			return
		self._process(event)

	def process_IN_DELETE(self, event):
		# Ignore WinSCP events.
		if event.pathname.endswith('.filepart'):
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
			log.debug("scan", "Ignoring moved-from event for non-MP3 %s" % event.pathname)
			return

		self._process(event)

	def process_IN_MOVED_SELF(self, event):
		raise DeletedDirectoryException

	def _process(self, event):
		# Ignore WinSCP events.
		if event.pathname.endswith('.filepart'):
			return

		try:
			matched_sids = []
			for song_dirs_path, sids in config.get('song_dirs').iteritems():
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

			_process_album_art_queue()
		except Exception as xception:
			_add_scan_error(event.pathname, xception)


def monitor():
	_common_init()

	pid = os.getpid()
	pid_file = open("%s/scanner.pid" % config.get_directory("pid_dir"), 'w')
	pid_file.write(str(pid))
	pid_file.close()

	mask = (
		pyinotify.IN_ATTRIB |
		pyinotify.IN_CREATE |
		pyinotify.IN_CLOSE_WRITE |
		pyinotify.IN_DELETE |
		pyinotify.IN_MOVED_TO |
		pyinotify.IN_MOVED_FROM |
		pyinotify.IN_MOVE_SELF |
		pyinotify.IN_EXCL_UNLINK
	)

	try:
		go = True
		while go:
			try:
				log.info("scan", "File monitor started.")
				wm = pyinotify.WatchManager()
				wm.add_watch(str(config.get("monitor_dir")), mask, rec=True)
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
