import sys
import os
import httplib
import urllib
import json
import time
import traceback

import tornado.httpserver
import tornado.ioloop
import tornado.web
import tornado.process
import tornado.options

import api.web
import api.help
import api.locale
from libs import log
from libs import config
from libs import dict_compare
from libs import db
from libs import chuser
from libs import cache
from libs import memory_trace
from libs import buildtools
from rainwave import playlist
from rainwave import schedule
import rainwave.request

request_classes = [
	(r"/api4/?", api.help.IndexRequest),
	(r"/api4/help/?", api.help.IndexRequest),
	(r"/api4/help/(.+)", api.help.HelpRequest),
	(r"/static/(.*)", tornado.web.StaticFileHandler, { 'path': os.path.join(os.path.dirname(__file__), "../static/") }),
	(r"/beta/static/(.*)", tornado.web.StaticFileHandler, { 'path': os.path.join(os.path.dirname(__file__), "../static/") }),
	(r"/favicon.ico", tornado.web.StaticFileHandler, { 'path': os.path.join(os.path.dirname(__file__), "../static/favicon.ico") })
]
testable_requests = []

class handle_url(object):
	def __init__(self, url):
		self.url = url

	def __call__(self, klass):
		klass.url = self.url
		request_classes.append((self.url, klass))
		api.help.add_help_class(klass, klass.url)
		return klass

class handle_api_url(handle_url):
	def __init__(self, url):
		super(handle_api_url, self).__init__("/api4/" + url)

class handle_api_html_url(handle_url):
	def __init__(self, url):
		super(handle_api_html_url, self).__init__("/pages/" + url)

def test_get(klass):
	testable_requests.append({ "method": "GET", "class": klass })

def test_post(klass):
	testable_requests.append({ "method": "POST", "class": klass })

class TestShutdownRequest(api.web.APIHandler):
	auth_required = False
	allow_get = True

	def post(self):
		self.write("Shutting down server.")

	def on_finish(self):
		tornado.ioloop.IOLoop.instance().stop() #add_timeout(time.time() + 2, tornado.ioloop.IOLoop.instance().stop)
		super(TestShutdownRequest, self).on_finish()

class APITestFailed(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class APIServer(object):
	def __init__(self):
		self.ioloop = None

	def _listen(self, task_id):
		import api_requests.sync
		api_requests.sync.init()
		
		# task_ids start at zero, so we gobble up ports starting at the base port and work up
		port_no = int(config.get("api_base_port")) + task_id

		pid = os.getpid()
		pid_file = open("%s/api_%s.pid" % (config.get_directory("pid_dir"), port_no), 'w')
		pid_file.write(str(pid))
		pid_file.close()

		# Log according to configured directory and port # we're operating on
		log_file = "%s/rw_api_%s.log" % (config.get_directory("log_dir"), port_no)
		if config.test_mode and os.path.exists(log_file):
			os.remove(log_file)
		log.init(log_file, config.get("log_level"))
		log.debug("start", "Server booting, port %s." % port_no)
		db.connect()
		cache.connect()
		memory_trace.setup(port_no)

		api.locale.load_translations()
		api.locale.compile_static_language_files()

		if config.get("web_developer_mode"):
			for station_id in config.station_ids:
				playlist.prepare_cooldown_algorithm(station_id)
			# automatically loads every station ID and fills things in if there's no data
			schedule.load()
			for station_id in config.station_ids:
				schedule.update_memcache(station_id)
				rainwave.request.update_line(station_id)
				rainwave.request.update_expire_times()
				cache.set_station(station_id, "backend_ok", True)
				cache.set_station(station_id, "backend_message", "OK")
				cache.set_station(station_id, "get_next_socket_timeout", False)
		
		for sid in config.station_ids:
			cache.update_local_cache_for_sid(sid)
			playlist.prepare_cooldown_algorithm(sid)
			playlist.update_num_songs()

		# If we're not in developer, remove development-related URLs
		if not config.get("developer_mode"):
			i = 0
			while (i < len(request_classes)):
				if request_classes[i][0].find("/test/") != -1:
					request_classes.pop(i)
					i = i - 1
				i = i + 1

		# Make sure all other errors get handled in an API-friendly way
		request_classes.append((r"/api/.*", api.web.Error404Handler))
		request_classes.append((r"/api4/.*", api.web.Error404Handler))
		request_classes.append((r".*", api.web.HTMLError404Handler))

		# Initialize the help (rather than it scan all URL handlers every time someone hits it)
		api.help.sectionize_requests()

		# Fire ze missiles!
		app = tornado.web.Application(request_classes,
			debug=(config.test_mode or config.get("developer_mode")),
			template_path=os.path.join(os.path.dirname(__file__), "../templates"),
			static_path=os.path.join(os.path.dirname(__file__), "../static"),
			autoescape=None)
		http_server = tornado.httpserver.HTTPServer(app, xheaders = True)
		http_server.listen(port_no)

		if config.get("api_user") and config.get("api_group"):
			chuser.change_user(config.get("api_user"), config.get("api_group"))

		if task_id == 0:
			buildtools.bake_css()
			# buildtools.bake_js()
			buildtools.bake_beta_js()

		for request in request_classes:
			log.debug("start", "   Handler: %s" % str(request))
		log.info("start", "API server on port %s ready to go." % port_no)
		self.ioloop = tornado.ioloop.IOLoop.instance()

		try:
			self.ioloop.start()
		finally:
			self.ioloop.stop()
			http_server.stop()
			db.close()
			log.info("stop", "Server has been shutdown.")
			log.close()

	def start(self):
		# Setup variables for the long poll module
		# Bypass Tornado's forking processes for Windows machines if num_processes is set to 1
		if config.get("api_num_processes") == 1 or config.get("web_developer_mode"):
			self._listen(0)
		else:
			# The way this works, is that the parent PID is hijacked away from us and everything after this
			# is a child process.  As of Tornado 2.1, fork() is used, which means we do have a complete
			# copy of all execution in memory up until this point and we will have complete separation of
			# processes from here on out.  Tornado handles child cleanup and zombification.
			#
			# We can have a config directive for numprocesses but it's entirely optional - a return of
			# None from the config option getter (if the config didn't exist) will cause Tornado
			# to spawn as many processes as there are cores on the server CPU(s).
			tornado.process.fork_processes(config.get("api_num_processes"))

			task_id = tornado.process.task_id()
			if task_id != None:
				self._listen(task_id)

	def test(self):
		# Fake a decorator call on the handle_url decorator
		handle_obj = handle_url("shutdown")
		handle_obj.__call__(TestShutdownRequest)

		tornado.process.fork_processes(2, 0)

		task_id = tornado.process.task_id()
		if task_id == 0:
			self._listen(task_id)
			# time.sleep(2)
			return True
		elif task_id == 1:
			time.sleep(1)
			return self._run_tests()
		elif task_id == None:
			print
			print "OK."
			return True
		return False

	def _run_tests(self):
		passed = True
		headers = ({"Content-type": "application/x-www-form-urlencoded", "Accept": "text/plain text/html text/javascript application/json application/javascript" })
		params = {}
		for request_pair in testable_requests:
			request = request_pair['class']
			sys.stdout.write(".")
			try:
				#print "*** ", request.url
				# Setup and get the data from the HTTP server
				params = {}
				if request.auth_required:
					params['user_id'] = 2
					params['key'] = "TESTKEY"
					if request.login_required or request.admin_required or request.dj_required:
						# admin login, user ID 2 currently is though.
						pass
					else:
						# need an anon user/key added to params here
						pass
				params['sid'] = 1
				params = urllib.urlencode(params)
				conn = httplib.HTTPConnection('localhost', config.get("api_base_port"))

				conn.request(request_pair['method'], "/api/%s" % request.url, params, headers)
				response = conn.getresponse()
				response_pass = True
				if response.status == 200:
					web_data = json.load(response)
					del(web_data['api_info'])

					ref_file = open("api_tests/%s.json" % request.url)
					ref_data = json.load(ref_file)
					ref_file.close()

					if not dict_compare.print_differences(ref_data, web_data):
						response_pass = False
						print "JSON from server:"
						print json.dumps(web_data, indent=4, sort_keys=True)
						print
				else:
					response_pass = False
				if not response_pass:
					passed = False
					print
					print "*** ERROR:", request.url, ": Response status", response.status
			except:
				print
				traceback.print_exc(file=sys.stdout)
				print "*** ERROR:", request.url, ": ", sys.exc_info()[0]
				passed = False
				print

		conn = httplib.HTTPConnection('localhost', config.get("api_base_port"))
		conn.request("GET", "/api/shutdown", params, headers)
		conn.getresponse()
		time.sleep(3)

		print
		print "----------------------------------------------------------------------"
		print "Ran %s tests." % len(testable_requests)

		return passed
