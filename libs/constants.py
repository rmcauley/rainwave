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

class Schedule(object):
	election = 0
	elec = 0
	adset = 1
	jingle = 2
	live = 3
	liveshow = 3
	oneshot = 4
	playlist = 5
	pause = 6
	dj = 7
	
class ElecSongTypes(object):
	conflict = 0
	warn = 1
	normal = 2
	queue = 3
	request = 4

class JSONName(object):
	current = "sched_current"
	next = "sched_next"
	history = "sched_history"
	requests_all = "requests_all"
	requests_user = "requests_user"
	all_albums = "playlist_all_albums"
	album_diff = "playlist_album_diff"
	live = "live_shows"
	dj = "current_dj"
	vote_result = "vote_result"
	
class SQLFields(object):
	allalbum = "rw_albums.album_id, rw_albums.sid, album_name, album_lastplayed, album_rating_avg, album_rating_count, album_totalrequests, album_totalvotes, album_lowest_oa, album_timesplayed, album_timeswon, album_timesdefeated"
	lightalbum = "rw_albums.album_id, album_name, album_rating_avg"
	allsong = "rw_songs.song_id, rw_songs.sid, rw_songs.song_rating_id, song_rating_sid, song_title, song_secondslong, song_available, song_timesdefeated, song_timeswon, song_timesplayed, song_addedon, song_releasetime, song_lastplayed, song_rating_avg, song_rating_count, song_totalvotes, song_totalrequests, song_url, song_comment AS song_urltext"
	lightsong = "rw_songs.song_id, rw_songs.song_rating_id, song_title, song_secondslong, song_rating_avg"
	allartist = "rw_artists.artist_id, artist_name, artist_lastplayed"
	allad = "rw_ads.ad_id, ad_title, ad_album, ad_artist, ad_genre, ad_comment, ad_secondslong, ad_url, ad_url_text"