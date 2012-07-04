station_ids = set()

station_id_friendly = {}

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
	
class ElecSongTypes(object):
	conflict = 0
	warn = 1
	normal = 2
	queue = 3
	request = 4
