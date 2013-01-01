import json
from libs import buildtools

# Options hash - please don't access this externally in case the storage method changes
_opts = {}

# This is used as a global flag.  Modules that require slightly different functionality
# under test purposes (e.g. bypass song verification) will look here to see if we're
# running in a test environment.
test_mode = False

station_ids = set()
station_id_friendly = {}

def load(file):
	global _opts
	global test_mode
	
	config_file = open(file)
	_opts = json.load(config_file)
	config_file.close()
	
	stations = _opts.pop('stations')
	_opts['stations'] = {}
	for key in stations.keys():
		_opts['stations'][int(key)] = stations[key]
	
	require('stations')
	set_station_ids(get("song_dirs"), get("station_id_friendly"))
	if get("test_mode") == True:
		test_mode = True
		
	_opts["build_number"] = buildtools.get_build_number()
		
def has(key):
	return key in _opts
	
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
	if not key in _opts['stations'][sid]:
		raise StandardError("Station SID %s has no configuration key %s." % (sid, key))
	return _opts['stations'][sid][key]

def set_station_ids(dirs, friendly):
	global station_ids
	global station_id_friendly
	
	sid_array = []
	for dir, sids in dirs.iteritems():
		for sid in sids:
			if sid_array.count(sid) == 0:
				sid_array.append(sid)
	station_ids = set(sid_array)
	
	for id, friendly in friendly.iteritems():
		station_id_friendly[int(id)] = friendly