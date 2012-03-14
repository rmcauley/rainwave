import os.path
import time
import magic
import sys

from libs import config
from libs import log
from libs import cache
from libs import db

from rainwave import playlist

_directories = {}
_scan_errors = None

def start():
	global _directories
	global _scan_errors
	
	_scan_errors = cache.get("backend_scan_errors")
	if not _scan_errors:
		_scan_errors = []
	_directories = config.get("song_dirs", True)
	full_update()
	
def full_update():
	# if config.test_mode:
		# db.c.update("DELETE FROM r4_songs")

	cache.set("backend_scan", "full scan")
	db.c.update("UPDATE r4_songs SET song_scanned = FALSE")
	_scan_directories()
	db.c.update("UPDATE r4_songs SET song_verified = FALSE WHERE song_scanned = FALSE")
	cache.set("backend_scan", "idle")
	
def _scan_directories():
	global _scan_errors
	global _directories
	
	ms = magic.open(magic.MAGIC_NONE)
	ms.load()
	
	leftovers = []
	for dir, sids in _directories.iteritems():
		for root, subdirs, files in os.walk(dir, followlinks = True):
			cache.set("backend_scan_size", len(files))
			file_counter = 0
			for filename in files:
				cache.set("backend_scan_counted", file_counter)
				fqfn = root + "/" + filename
				try:
					filetype = ms.file(fqfn)
					if filetype and filetype.count("MPEG") and filetype.count("layer III"):
						playlist.Song.load_from_file(fqfn, sids)
				except Exception as xception:
					# xception = sys.exc_info()[1]
					_scan_errors.insert(0, { "time": time.time(), "file": fqfn, "type": xception.__class__.__name__, "error": str(xception) })
					log.exception("scan", "Error scanning %s" % fqfn, xception)
					if config.test_mode:
						raise Exception(_scan_errors[0])
	_save_scan_errors()
	
def _save_scan_errors():
	global _scan_errors
	
	if len(_scan_errors) > 100:
		_scan_errors = _scan_errors[0:100]
	cache.set("backend_scan_errors", _scan_errors)