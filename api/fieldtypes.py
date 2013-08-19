import re
from libs import config
from libs import db

string_error = "must be a string."
def string(in_string):
	if not in_string:
		return None
	return string(in_string)

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

# TODO: Go over the entire project and use this where necessary
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
