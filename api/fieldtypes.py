import re
from libs import config
from libs import db
import rainwave.events.event

string_error = "must be a string."
def string(in_string, request = None):
	if not in_string:
		return None
	return str(in_string)

# All _error variables start with no capital letter and end with a period.
numeric_error = "must be a number."
def numeric(str, request = None):
	if not numeric:
		return None
	if not re.match('^\d+$', str):
		return None
	return str

integer_error = "must be a number."
def integer(str, request = None):
	if not str:
		return None
	if not re.match('^-?\d+$', str):
		return None
	return int(str)

song_id_error = "must be a valid song ID."
def song_id(str, request = None):
	if not str:
		return None
	if not re.match('^\d+$', str):
		return None
	song_id = int(str)
	if db.c.fetch_var("SELECT COUNT(*) FROM r4_songs WHERE song_id = %s AND song_verified = TRUE", (song_id,)) == 0:
		return None
	return song_id

song_id_matching_sid_error = "must be a valid song ID that exists on the requested station ID."
def song_id_matching_sid(str, request):
	if not str or not request:
		return None
	if not re.match('^\d+$', str):
		return None
	song_id = int(str)
	if db.c.fetch_var("SELECT COUNT(*) FROM r4_song_sid WHERE song_id = %s AND sid = %s", (song_id, request.sid)) == 0:
		return None
	return song_id

album_id_error = "must be a valid album ID."
def album_id(str, request = None):
	if not str:
		return None
	if not re.match('^\d+$', str):
		return None
	album_id = int(str)
	if db.c.fetch_var("SELECT COUNT(*) FROM r4_albums WHERE album_id = %s", (album_id,)) == 0:
		return None
	return album_id

artist_id_error = "must be a valid artist ID."
def artist_id(str, request = None):
	if not str:
		return None
	if not re.match('^\d+$', str):
		return None
	artist_id = int(str)
	if db.c.fetch_var("SELECT COUNT(*) FROM r4_artists WHERE artist_id = %s", (artist_id,)) == 0:
		return None
	return artist_id

sched_id_error = "must be a valid schedule ID."
def sched_id(str, request = None):
	if not str:
		return None
	if not re.match('^\d+$', str):
		return None
	sched_id = int(str)
	if db.c.fetch_var("SELECT COUNT(*) FROM r4_schedule WHERE sched_id = %s", (sched_id,)) == 0:
		return None
	return sched_id

positive_integer_error = "must be a positive number."
def positive_integer(str, request = None):
	if not str:
		return None
	if not re.match('^\d+$', str):
		return None
	nmbr = int(str)
	if nmbr <= 0:
		return None
	return nmbr

zero_or_greater_integer_error = "must be positive number or zero."
def zero_or_greater_integer(str, request = None):
	if not str:
		return None
	if not re.match('^\d+$', str):
		return None
	nmbr = int(str)
	if nmbr < 0:
		return None
	return nmbr

float_num_error = "must be a number."
def float_num(str, request = None):
	if not str:
		return None
	if not re.match('^\d+(.\d+)?$', str):
		return None
	return float(str)

long_num_error = "must be a number."
def long_num(str, request = None):
	if not str:
		return None
	if not re.match('^\d+$', str):
		return None
	return long(str)

rating_error = "must >= 1.0 and <= 5.0 in increments of	0.5."
def rating(str, request = None):
	if not str:
		return None
	r = float_num(str)
	if not r:
		return None
	if r < 1 or r > 5:
		return None
	if not (r * 10) % 5 == 0:
		return None
	return r

boolean_error = "must be 'true' or 'false'."
def boolean(str, request = None):
	if not str:
		return None
	if str == "true":
		return True
	elif str == "false":
		return False
	return None

user_id_error = "must be a valid user ID."
def user_id(str, request = None):
	u = positive_integer(str, request)
	if not u:
		return None
	if not db.c.fetch_var("SELECT user_id FROM phpbb_users WHERE user_id = %s", (u,)):
		return None
	return u

valid_relay_error = "must be a known and valid relay's IP address."
def valid_relay(str, request = None):
	if not str:
		return None
	for name, value in config.get("relays").iteritems():
		if value['ip_address'] == str:
			return name
	return None

sid_error = "must be a valid station ID."
def sid(str, request = None):
	if not str:
		return None
	sid = integer(str, request)
	if not sid:
		return None
	if sid in config.station_ids:
		return sid
	return None

integer_list_error = "must be a comma-separated list of integers."
def integer_list(str, request = None):
	if not str:
		return None
	if not re.match('^(\d+)(,\d+)*$', str):
		return None
	l = []
	for entry in str.split(","):
		l.append(int(entry))
	return l

# Careful, this one could get expensive with all the song ID queries
song_id_list_error = "must be a comma-separated list of valid song IDs."
def song_id_list(str, request = None):
	if not str:
		return None
	l = integer_list(str)
	if not l:
		return None
	for song_id in l:
		if db.c.fetch_var("SELECT COUNT(*) FROM r4_songs WHERE song_id = %s AND song_verified = TRUE", (song_id,)) == 0:
			return None
	return l

# Returns a set of (mount, user_id, listen_key)
icecast_mount_error = "invalid Icecast origin."
def icecast_mount(str, request = None):
	if not str:
		return None
	m = re.search(r"^/(?P<mount>[\d\w\-.]+)(\?(?P<user>\d+):(?P<key>[\d\w]+))?(?:\?\d+\.(?:mp3|ogg))?$", str)
	if not m:
		return None

	rd = m.groupdict()
	mount = rd["mount"]
	user_id = 1
	listen_key = None
	if "user" in rd and rd["user"]:
		user_id = long(rd["user"])
		listen_key = rd["key"]
	return (mount, user_id, listen_key)

ip_address_error = "invalid IP address."
def ip_address(addr, request = None):
	if not addr:
		return None
	return addr
	# try:
	# 	if addr.find(":"):
	# 		socket.inet_pton(socket.AF_INET6, addr)
	# 	else:
	# 		socket.inet_pton(socket.AF_INET, addr)
	# 	return addr
	# except socket.error:
	# 	return None
	# return None

media_player_error = None
def media_player(str, request = None):
	ua = str.lower()
	if ua.find("firefox") > -1:
		return "Firefox"
	elif ua.find("chrome") > -1:
		return "Chrome"
	elif ua.find("safari") > -1:
		return "Safari"
	elif ua.find("foobar") > -1:
		return "Foobar2000"
	elif ua.find('dalvik') > -1 or ua.find('android') > -1:
		return "Android"
	elif ua.find('stagefright') > -1 or ua.find('servestream') > -1:
		return "Android (App)"
	elif ua.find('lavf') > -1:
		return "LAV"
	elif ua.find('ffmpeg') > -1:
		return "FFmpeg"
	elif ua.find("winamp") > -1:
		return "Winamp"
	elif ua.find("vlc") > -1 or ua.find("videolan") > -1:
		return "VLC"
	elif ua.find('applecoremedia') > -1 and ua.find('mac os x') > -1:
		return "iTunes (iPhone)"
	elif ua.find('applecoremedia') > -1:
		return "iTunes (Mac OS)"
	elif ua.find('cfnetwork') > -1 and ua.find('darwin') > -1:
		return "iPhone (App)"
	elif ua.find("minecraft") > -1:
		return "Minecraft"
	elif ua.find('clementine') > -1:
		return "Clementine"
	elif ua.find("xine") > -1:
		return "Xine"
	elif ua.find('audacious') > -1:
		return 'Audacious'
	elif ua.find("fstream") > -1:
		return "Fstream"
	elif ua.find("bass") > -1:
		return "BASS/XMplay"
	elif ua.find("xion") > -1:
		return "Xion"
	elif ua.find("itunes") > -1:
		return "iTunes"
	elif ua.find('muses') > -1 or ua.find('fmod') > -1:
		return "Flash Player"
	elif ua.find('mozilla') > -1:
		return "Mozilla"
	elif ua.find('wmplayer') > -1 or ua.find('nsplayer') > -1:
		return "Windows Media"
	elif ua.find('mediamonkey') > -1:
		return "MediaMonkey"
	elif ua.find('XBMC') > -1:
		return "XBMC"
	elif ua == "-":
		return "None"
	return "Unknown (" + str + ")"

producer_type_error = None
def producer_type(str, request = None):
	if str not in rainwave.events.event.all_producers:
		return None
	return str
	
group_id_error = "must be a valid group ID."
def group_id(str, request = None):
	if not str:
		return None
	if not re.match('^\d+$', str):
		return None
	group_id = int(str)
	if db.c.fetch_var("SELECT COUNT(*) FROM r4_groups WHERE group_id = %s", (group_id,)) == 0:
		return None
	return group_id
