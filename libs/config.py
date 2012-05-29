import json
from libs import constants

# TODO: Enable reflection/inspection here to find out where config lines are called from
# for easy documentation purposes

# Options hash - please don't access this externally in case the storage method changes
_opts = {}

# This is used as a global flag.  Modules that require slightly different functionality
# under test purposes (e.g. bypass song verification) will look here to see if we're
# running in a test environment.
test_mode = False

def load(file):
	global _opts
	global test_mode
	
	config_file = open(file)
	_opts = json.load(config_file)
	config_file.close()
	
	require('stations')
	constants.set_station_ids(get("song_dirs"), get("station_id_friendly"))
	if get("test_mode") == True:
		test_mode = True
	
def require(key):
	if not key in _opts:
		raise StandardError("Required configuration key '%s' not found." % key)
		
def get(key):
	require(key)
	return _opts[key]
	
def override(key, value):
	_opts[key] = value
	
def get_station(sid, key):
	if not sid in _opts['stations']:
		raise StandardError("Station SID %s has no configuration." % sid)
	if not key in _options['stations']:
		raise StandardError("Station SID %s has no configuration key %s." % (sid, key))
	return _opts['stations'][sid][key]
