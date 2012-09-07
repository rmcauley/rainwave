import os.path
import time
import magic
import sys
import pyinotify
import asyncore
import psutil
from PIL import Image

from libs import config
from libs import log
from libs import cache
from libs import db

from rainwave import playlist

_directories = {}
_scan_errors = None
_ms = magic.open(magic.MAGIC_NONE)
_ms.load()
_wm = pyinotify.WatchManager()

def start(full_scan):
	global _directories
	global _scan_errors
	
	_scan_errors = cache.get("backend_scan_errors")
	if not _scan_errors:
		_scan_errors = []
	_directories = config.get("song_dirs", True)
	
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
	
def _scan_directories():
	global _scan_errors
	global _directories
	
	leftovers = []
	for dir, sids in _directories.iteritems():
		for root, subdirs, files in os.walk(dir, followlinks = True):
			cache.set("backend_scan_size", len(files))
			file_counter = 0
			for filename in files:
				cache.set("backend_scan_counted", file_counter)
				fqfn = root + "/" + filename
				print fqfn
				_scan_file(fqfn, sids, True)
	_save_scan_errors()
	
def _is_mp3(filename):
	filetype = _ms.file(filename)
	if filetype and filetype.count("MPEG") and filetype.count("layer III"):
		return True
	return False

def _is_image(filename):
	filetype = _ms.file(filename)
	if filetype and (filetype.count("PNG") or filetype.count("GIF") or filetype.count("JPEG")):
		return True
	return False
	
def _scan_file(filename, sids, mp3_only = False):
	try:
		if _is_mp3(filename):
			# print "Scanning %s" % filename
			# Only scan the file if we don't have a previous mtime for it, or the mtime is different
			old_mtime = db.c.fetch_var("SELECT song_file_mtime FROM r4_songs WHERE song_filename = %s", (filename,))
			if not old_mtime or old_mtime != os.stat(filename)[8]:
				playlist.Song.load_from_file(filename, sids)
		if not mp3_only and _is_image(filename):
			process_album_art(filename)
	except Exception as xception:
		_add_scan_error(filename, xception)
		
def process_album_art(filename):
	directory = filename[0:filename.rfind("/")]
	album_ids = db.c.fetch_list("SELECT DISTINCT album_id FROM r4_songs JOIN r4_song_album USING (song_id) WHERE song_filename LIKE %s% AND r4_song_album.album_is_tag = TRUE", (directory,))
	if not album_ids or len(album_id) == 0:
		return
	im_original = Image.open(filename)
	im_320 = None
	im_240 = None
	im_120 = None
	if im_original.size[0] > 420 or im_original.size[1] > 420:
		im_320 = im_original.copy().thumbnail((320, 320), Image.ANTIALIAS)
	else:
		im_320 = im_original
	if im_original.size[0] > 260 or im_original.size[1] > 260:
		im_240 = im_original.copy().thumbnail((240, 240), Image.ANTIALIAS)
	else:
		im_240 = im_original
	if im_original.size[0] > 160 or im_original.size[1] > 160:
		im_120 = im_original.copy().thumbnail((120, 120), Image.ANTIALIAS)
	else:
		im_120 = im_original
	for album_id in album_ids:
		im_120.save("%s/%s_120.jpg" % (config.get("album_art_directory"), album_id))
		im_240.save("%s/%s_240.jpg" % (config.get("album_art_directory"), album_id))
		im_320.save("%s/%s.jpg" % (config.get("album_art_directory"), album_id))
			
def _disable_file(filename):
	try:
		if _is_mp3(filename):
			song = playlist.Song.load_from_file(filename, [])
			song.disable()
	except Exception as xception:
		_add_scan_error(filename, xception)
	
def _add_scan_error(filename, xception):
	global _scan_errors
	
	_scan_errors.insert(0, { "time": time.time(), "file": filename, "type": xception.__class__.__name__, "error": str(xception) })
	log.exception("scan", "Error scanning %s" % filename, xception)
	if config.test_mode:
		raise Exception(_scan_errors[0])

def _save_scan_errors():
	global _scan_errors
	
	if len(_scan_errors) > 100:
		_scan_errors = _scan_errors[0:100]
	cache.set("backend_scan_errors", _scan_errors)

def monitor():
	global _wm
	
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
	
class EventHandler(pyinotify.ProcessEvent):
	def __init__(self, sids):
		self.sids = sids

	def process_IN_CREATE(self, event):
		_scan_file(event.pathname, self.sids)
		
	def process_IN_MODIFY(self, event):
		_scan_file(event.pathname, self.sids)
		
	def process_IN_DELETE(self, event):
		_disable_file(event.pathname)