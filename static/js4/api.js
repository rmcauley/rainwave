'use strict';

var API = function() {
	var sid, url, user_id, api_key;
	var sync, sync_params, sync_stopped, sync_timeout_id, sync_timeout_errors;
	var async, async_queue;
	var callbacks = {};
	var universal_callbacks = [];

	var self = {};

	self.initialize = function(n_sid, n_url, n_user_id, n_api_key, json) {
		sid = n_sid;
		url = n_url;
		user_id = n_user_id;
		api_key = n_api_key;

		sync = new XMLHttpRequest();
		sync.onload = sync_complete;
		sync.onerror = sync_error;
		sync.ontimeout = sync_timeout;
		sync_params = self.serialize({ "sid": sid, "user_id": user_id, "key": api_key });
		sync_stopped = false;
		sync_timeout_errors = 0;

		async = new XMLHttpRequest();
		async.onload = async_complete;
		async.onerror = async_error;
		async_ready = true;
		async_queue = [];

		perform_callbacks(json);
		sync_get();
	}

	// easy to solve, but stolen from http://stackoverflow.com/questions/1714786/querystring-encoding-of-a-javascript-object
	self.serialize = function(obj) {
		var str = [];
		for (var p in obj) {
			str.push(p + "=" + encodeURIComponent(obj[p]));
		}
		return str.join("&");
	};

	self.sync_start = function() {
		if (sync_on === true) return false;
		performCallbacks(initial_payload);
		sync_get();
		return true;
	};

	var sync_get = function() {
		if (sync_stopped) {
			return;
		}

		sync.open("POST", url + "sync", true)
		sync.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		sync.send(sync_params);
	};

	self.sync_stop = function() {
		if (sync_timeout_id) {
			clearTimeout(sync_timeout_id)
			sync_timeout_id = null;
		}
		sync_stopped = true;
		sync.abort();
		ErrorHandler.permanent_error(ErrorHandler.make_error("sync_stopped", 500));
	};

	var sync_error = function() {
		// TODO: handle non-JSON errors here
		self.sync_stop();
	};

	var sync_timeout = function() {
		sync_timeout_errors++;
		if (sync_timeout_errors > 2) {
			ErrorHandler.permanent_error(ErrorHandler.make_error("api_timeout", 408));
		}
	};

	var sync_complete = function() {
		if (sync_stopped) {
			return;
		}
		if (sync.readyState !== 4) {
			return;
		}
		// if the API is outputting JSON it always outputs status code 200
		// the error code, if any, lives in error.code
		if (sync.status != 200) {
			sync_error();
			return;
		}

		var sync_restart_pause = 3000;
		var response = JSON.parse(sync.responseText);
		perform_callbacks(response);
		perform_callbacks({ "_SYNC_COMPLETE": true });

		if ("error" in response) {
			sync_restart_pause = 10000;
			if (error.code != 200) {
				sync_stopped = true;
			}
		}
		else {
			ErrorHandler.remove_permanent_error("api_timeout");
			ErrorHandler.remove_permanent_error("station_offline");
		}

		sync_timeout_id = setTimeout(sync_get, sync_restart_pause);
	};

	var async_complete = function() {
		if (sync.readyState !== 4) {
			return;
		}
		perform_callbacks(JSON.parse(async.responseText));
		async_get();
	};

	self.async_get = function(action, params) {
		if (action && params) {
			async_queue.push({ "action": action, "params": params });
		}
		if (async.readyState == 4) {
			to_do = async_queue.shift()
			async.open("POST", url + to_do.action, true);
			async.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			to_do.params.sid = sid;
			to_do.params.user_id = user_id;
			to_do.params.key = api_key;
			async.send(self.serialize(to_do.params));
		}
	};

	var perform_callbacks = function(json) {
		var cb, key;
		for (key in json) {
			if (key in callbacks) {
				try {
					for (cb = 0; cb < callbacks[key].length; cb++) {
						callbacks[key][cb](json);
					}
					for (cb = 0; cb < universal_callbacks.length; cb++) {
						universal_callbacks[cb](key, json);
					}
				}
				catch(err) {
					// TODO: JS error callback: error(err, json)
					self.sync_stop();
					return;
				}
			}
		}
	};

	self.add_callback = function(js_func, api_name) {
		if (!callbacks[api_name]) callbacks[api_name] = [];
		callbacks[api_name].push(method);
	};


	self.add_universal_callback = function(method) {
		universal_callbacks.push(method);
	};

	return self;
}();
