import logging
import logging.handlers
import datetime

log = None

class RWFormatter(logging.Formatter):
	def format(self, record):
		msg = logging.Formatter.format(self, record)
		return "%s - %s - %s" % (datetime.datetime.now().strftime('%m-%d %H:%M:%S'), record.levelname.ljust(8), msg)

def init(logfile, loglevel = "warning"):
	global log
	logging.getLogger().setLevel(logging.DEBUG)
	logging.getLogger("tornado.access").setLevel(logging.CRITICAL)

	handler = logging.handlers.RotatingFileHandler(logfile, maxBytes = 10000000, backupCount = 1)
	handler.setFormatter(RWFormatter())
	print_handler = logging.StreamHandler()
	print_handler.setFormatter(RWFormatter())
	print_handler.setLevel(logging.DEBUG)

	logging.getLogger("tornado.general").addHandler(handler)
	log = logging.getLogger("tornado.application")
	log.addHandler(handler)

	if loglevel == "print":
		log.addHandler(print_handler)
		logging.getLogger("tornado.general").addHandler(print_handler)

	if loglevel == "critical":
		handler.setLevel(logging.CRITICAL)
	elif loglevel == "error":
		handler.setLevel(logging.ERROR)
	elif loglevel == "info":
		handler.setLevel(logging.INFO)
	elif loglevel == "debug":
		handler.setLevel(logging.DEBUG)
	else:
		handler.setLevel(logging.WARNING)
	debug("test", "Debug test.")
	info("test", "Info test.")
	warn("test", "Warn test.")
	error("test", "Error test.")
	critical("test", "Critical test.")

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
