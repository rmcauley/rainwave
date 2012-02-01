import os.path
from libs import config
from libs import db
from libs import log
from rainwave.song import Song

_directories = {}

def start():
	if config.test_mode:
		db.c.update("DELETE FROM rw_songs")

	global _directories
	_directories = config.get("song_dirs", True)
	db.c.update("UPDATE rw_songs SET song_scanned = FALSE")
	_scan_directories()
	db.c.update("UPDATE rw_songs SET song_verified = FALSE WHERE song_scanned = FALSE")
	
def _scan_directories():
	leftovers = []
	for dir, sids in _directories.iteritems():
		for root, subdirs, files in os.walk(dir, followlinks = True):
			for filename in files:
				_scan_file(file, sids)
	
def _scan_directory(arg, dirname, filenames):
	sids = _directories[dirname]

	# TODO: _scan_file for each sid
	for filename in filenames:
		_scan_file(filename, sids)

def _scan_file(filename, sids):
	log.debug("scan", "Scanning: %s" % filename)
	Song.load_from_file(filename)