import re
from libs import config

string_error = "must be a string."
def string(str):
	return str

# All _error variables start with no capital letter and end with a period.
numeric_error = "must be a number."
def numeric(str):
	if not re.match('^\d+$', str):
		return None
	return str
	
integer_error = "must be a number."
def integer(str):
	if not re.match('^\d+$', str):
		return None
	return int(str)
	
positive_integer_error = "must be a positive number."
def positive_integer(str):
	if not re.match('^\d+$', str):
		return None
	nmbr = int(str)
	if nmbr <= 0:
		return None
	return nmbr
	
float_num_error = "must be a number."
def float_num(str):
	if not re.match('^\d+(.\d+)?$', str):
		return None
	return float(str)
	
long_num_error = "must be a number."
def long_num(str):
	if not re.match('^\d+$', str):
		return None
	return long(str)

rating_error = "must >= 1.0 and <= 5.0 in increments of	0.5."
def rating(str):
	r = float_num(str)
	if not r:
		return None
	if r < 1 or r > 5:
		return None
	if not (r * 10) % 5 == 0:
		return None
	return r

boolean_error = "must be 'true' or 'false'."
def boolean(str):
	if str == "true":
		return True
	elif str == "false":
		return False
	return None
	
valid_relay_error = "must be a known and valid relay's IP address."
def valid_relay(str):
	for name, value in config.get("relays").iteritems():
		if value['ip_address'] == str:
			return name
	return None