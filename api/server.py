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
from libs import log
from libs import config
from libs import dict_compare
from libs import db
from libs import chuser
from libs import cache

request_classes = [(r"/api/?", api.help.IndexRequest), (r"/api/help/?", api.help.IndexRequest), (r"/api/help/(.+)", api.help.HelpRequest)]
testable_requests = []

class handle_url(object):
	def __init__(self, url):
		self.url = url
	
	def __call__(self, klass):
		klass.url = self.url
		request_classes.append((r"/api/" + self.url, klass))
		return klass
		
def test_get(klass):
	testable_requests.append({ "method": "GET", "class": klass })
	api.help.add_help_class("GET", klass, klass.url)
	
def test_post(klass):
	testable_requests.append({ "method": "POST", "class": klass })
	api.help.add_help_class("POST", klass, klass.url)
	
class TestShutdownRequest(api.web.RequestHandler):
	auth_required = False
	def get(self):
		self.write("Shutting down server.")
	
	def on_finish(self):
		tornado.ioloop.IOLoop.instance().stop() #add_timeout(time.time() + 2, tornado.ioloop.IOLoop.instance().stop)
		
class APITestFailed(Exception):
	def __init__(self, value):
		self.value = value
	def __str__(self):
		return repr(self.value)

class APIServer(object):
	def __init__(self):
		pid = os.getpid()
		pid_file = open(config.get("api_pid_file"), 'w')
		pid_file.write(str(pid))
		pid_file.close()
	
	def _listen(self, task_id):
		# task_ids start at zero, so we gobble up ports starting at the base port and work up
		port_no = int(config.get("api_base_port")) + task_id
		
		# Log according to configured directory and port # we're operating on
		log_file = "%s/rw_api_%s.log" % (config.get("api_log_dir"), port_no)
		if config.test_mode and os.path.exists(log_file):
			os.remove(log_file)
		log.init(log_file, config.get("log_level"))
		log.debug("start", "Server booting, port %s." % port_no)
		db.open()
		cache.open()
		
		# Fire ze missiles!
		app = tornado.web.Application(request_classes, debug=config.get("test_mode"))
		http_server = tornado.httpserver.HTTPServer(app, xheaders = True)
		http_server.listen(port_no)
		
		if config.get("api_user") and config.get("api_group"):
			chuser.change_user(config.get("api_user"), config.get("api_group"))
		
		for request in request_classes:
			log.debug("start", "   Handler: %s" % str(request))
		for sid in config.station_ids:
			cache.update_local_cache_for_sid(sid)
		log.info("start", "Server bootstrapped and ready to go.")
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
				if response.status == 200:
					web_data = json.load(response)
					del(web_data['api_info'])
					
					ref_file = open("api_tests/%s.json" % request.url)
					ref_data = json.load(ref_file)
					ref_file.close()
					
					if not dict_compare.print_differences(ref_data, web_data):
						passed = False
						print "JSON from server:"
						print json.dumps(web_data, indent=4, sort_keys=True)
						print
				else:
					print
					print "*** ERROR:", request.url, ": Response status", response.status
					passed = False
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
