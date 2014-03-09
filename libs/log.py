import logging
import logging.handlers
import sys

log = None

def init(logfile, loglevel = "warning"):
	global log
	
	handler = logging.handlers.RotatingFileHandler(logfile, maxBytes = 20000000, backupCount = 1)
	handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
	logging.getLogger("rainwave").addHandler(handler)
	
	if loglevel == "print":
		print_handler = logging.StreamHandler(sys.stdout)
		print_handler.setFormatter(logging.Formatter("%(levelname)s - %(message)s"))
		logging.getLogger("rainwave").addHandler(print_handler)

	# log = logging.getLogger("rainwave")
	# if loglevel == "critical":
	# 	log.setLevel(logging.CRITICAL)
	# elif loglevel == "error":
	# 	log.setLevel(logging.ERROR)
	# elif loglevel == "info":
	# 	log.setLevel(logging.INFO)
	# elif loglevel == "debug" or loglevel == "print":
	# 	log.setLevel(logging.DEBUG)
	# else:
	# 	log.setLevel(logging.WARNING)
		
def close():
	logging.shutdown()
	
def _massage_line(key, message, user):
	user_info = ""
	if user and user.user_id > 1:
		user_info = "u%s" % user.user_id
	elif user:
		user_info = "a%s" % user.ip_address
	return " %-15s [%-15s] %s" % (user_info, key, message)
	
def debug(key, message, user = None):
	if not log:
		return
	log.debug(_massage_line(key, message, user))
	
def warn(key, message, user = None):
	if not log:
		return
	log.warn(_massage_line(key, message, user))
	
def info(key, message, user = None):
	if not log:
		return
	log.info(_massage_line(key, message, user))
	
def error(key, message, user = None):
	if not log:
		return
	log.error(_massage_line(key, message, user))
	
def critical(key, message, user = None):
	if not log:
		return
	log.critical(_massage_line(key, message, user))
	
def exception(key, message, e):
	log.critical(_massage_line(key, message, None), exc_info = e)