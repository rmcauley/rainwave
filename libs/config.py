import json
import os
import getpass
import tornado.escape
import tempfile

# Options hash - please don't access this externally in case the storage method changes
_opts = {}
build_number = 0

# This is used as a global flag.  Modules that require slightly different functionality
# under test purposes (e.g. bypass song verification) will look here to see if we're
# running unit tests.
test_mode = False

station_ids = set()
station_id_friendly = {}
station_hostnames = {}
public_relays = None
public_relays_json = {}
station_list = {}
station_list_json = {}
station_mounts = {}
station_mount_filenames = {}

def get_build_number():
	bnf = open(os.path.join(os.path.dirname(__file__), "../etc/buildnum"), 'r')
	bn = int(bnf.read())
	bnf.close()
	return bn

def get_config_file(testmode = False):
	if os.path.isfile("etc/%s.conf" % getpass.getuser()):
		return ("etc/%s.conf" % getpass.getuser())
	elif testmode and os.path.isfile("etc/rainwave_test.conf"):
		return ("etc/rainwave_test.conf")
	elif os.path.isfile("etc/rainwave.conf"):
		return ("etc/rainwave.conf")
	elif os.path.isfile("/etc/rainwave.conf"):
		return ("/etc/rainwave.conf")
	elif testmode:
		raise RuntimeError("Could not find a configuration file at etc/rainwave_test.conf.")
	else:
		raise RuntimeError("Could not find a configuration file at etc/rainwave.conf or /etc/rainwave.conf")

def load(filename = None, testmode = False):
	global _opts
	global test_mode
	global build_number
	global public_relays
	global public_relays_json
	global station_ids
	global station_list
	global station_list_json
	global station_hostnames
	global station_mount_filenames

	if not filename:
		filename = get_config_file(testmode)

	config_file = open(filename)
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

	public_relays = {}
	for sid in station_ids:
		public_relays[sid] = []
		public_relays[sid].append({
			"name": "Random",
			"protocol": "http://",
			"hostname": get_station(sid, "round_robin_relay_host"),
			"port": get_station(sid, "round_robin_relay_port"),
			#"url": "http://%s:%s" % (get_station(sid, "round_robin_relay_host"), get_station(sid, "round_robin_relay_port"))
		})
		for relay_name, relay in get("relays").iteritems():
			if sid in relay['sids']:
				public_relays[sid].append({
					"name": relay_name,
					"protocol": relay['protocol'],
					"hostname": relay['hostname'],
					"port": relay['port'],
					#'url': "http://%s:%s" % (relay['hostname'], relay['port'])
				})
		public_relays_json[sid] = tornado.escape.json_encode(public_relays[sid])
		station_hostnames[get_station(sid, "host")] = sid
		station_mount_filenames[sid] = get_station(sid, "stream_filename")

	station_list = {}
	for station_id in station_ids:
		station_list[station_id] = {
			"id": station_id,
			"name": station_id_friendly[station_id],
			"url": "http://%s" % get_station(station_id, "host")
		}
		station_mounts[get_station(station_id, "stream_filename") + ".mp3"] = station_id
		station_mounts[get_station(station_id, "stream_filename") + ".ogg"] = station_id
	station_list_json = tornado.escape.json_encode(station_list)

	build_number = get_build_number()

def has(key):
	return key in _opts

def require(key):
	if not key in _opts:
		raise StandardError("Required configuration key '%s' not found." % key)

def get(key):
	require(key)
	return _opts[key]

def get_directory(key):
	value = get(key)
	if not value:
		return tempfile.gettempdir()
	return value

def set_value(key, value):
	_opts[key] = value
	return value

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
	for d, sids in dirs.iteritems():	#pylint: disable=W0612
		for sid in sids:
			if sid_array.count(sid) == 0 and sid != 0:
				sid_array.append(sid)
	station_ids = set(sid_array)

	for sid, friendly in friendly.iteritems():
		station_id_friendly[int(sid)] = friendly
