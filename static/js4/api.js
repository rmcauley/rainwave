var API = function() {
	"use strict";
	var sid, url, user_id, api_key;
	var sync, sync_params, sync_stopped, sync_timeout_id, sync_error_count, sync_resync;
	var sync_timeout_error_removal_timeout;
	var async, async_queue;
	var callbacks = {};
	var universal_callbacks = [];
	var offline_ack = false;
	var known_event_id = 0;
	var mobile_syncing;

	var self = {};

	self.initialize = function(n_sid, n_url, n_user_id, n_api_key, json) {
		sid = n_sid;
		url = n_url;
		user_id = n_user_id;
		api_key = n_api_key;

		sync = new XMLHttpRequest();
		sync.onload = sync_complete;
		sync.onerror = sync_error;
		sync.ontimeout = sync_error;
		sync_params = self.serialize({ "sid": sid, "user_id": user_id, "key": api_key });
		sync_stopped = false;
		sync_resync = false;
		sync_error_count = 0;

		async = new XMLHttpRequest();
		async.onload = async_complete;
		async.onerror = async_error;
		async.ontimeout = async_timeout;
		async_queue = [];

		if ("sched_current" in json) {
			known_event_id = json.sched_current.id;
		}
		self.add_callback(function(json) { known_event_id = json.id; }, "sched_current");

		// Make sure the clock gets initialized first
		perform_callbacks({ "api_info": json.api_info });

		// Call back the heavy playlist functions first
		var lists = [ "all_albums", "all_artists", "current_listeners" ];
		var temp_json;
		for (var i = 0; i < lists.length; i++) {
			if (lists[i] in json) {
				temp_json = {};
				temp_json[lists[i]] = json[lists[i]];
				perform_callbacks(temp_json);
				delete(json[lists[i]]);
			}
		}

		perform_callbacks(json);
		perform_callbacks({ "_SYNC_COMPLETE": { "complete": true } });
		// Make sure any vote results are registered now (after the schedule has been loaded)
		if ("vote_result" in json) {
			perform_callbacks({ "vote_result": json.vote_result });
		}

		if (!MOBILE) sync_get();
	};

	// easy to solve, but stolen from http://stackoverflow.com/questions/1714786/querystring-encoding-of-a-javascript-object
	self.serialize = function(obj) {
		var str = [];
		for (var p in obj) {
			str.push(p + "=" + encodeURIComponent(obj[p]));
		}
		return str.join("&");
	};

	var sync_get = function() {
		if (sync_stopped) {
			return;
		}

		sync.open("POST", url + "sync", true);
		sync.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		clear_sync_timeout_error_removal_timeout();
		sync_timeout_error_removal_timeout = setTimeout(clear_sync_timeout_error, 15000);
		var local_sync_params = sync_params;
		if (offline_ack) {
			local_sync_params += "&offline_ack=true";
		}
		if (sync_resync) {
			local_sync_params += "&resync=true";
			sync_resync = false;
		}
		local_sync_params += "&known_event_id=" + known_event_id;
		sync.send(local_sync_params);
	};

	var clear_sync_timeout_error_removal_timeout = function() {
		if (sync_timeout_error_removal_timeout) {
			clearTimeout(sync_timeout_error_removal_timeout);
		}
		sync_timeout_error_removal_timeout = null;
	};

	var clear_sync_timeout_error = function() {
		sync_timeout_error_removal_timeout = null;
		ErrorHandler.remove_permanent_error("sync_retrying");
	};

	self.sync_stop = function() {
		clear_sync_timeout_error_removal_timeout();
		sync_clear_timeout();
		sync_stopped = true;
		sync.abort();
		ErrorHandler.permanent_error(ErrorHandler.make_error("sync_stopped", 500));
	};

	var sync_clear_timeout = function() {
		if (sync_timeout_id) {
			clearTimeout(sync_timeout_id);
			sync_timeout_id = null;
		}
	};

	var sync_error = function() {
		clear_sync_timeout_error_removal_timeout();
		var result;
		try {
			if (sync.responseText) {
				result = JSON.parse(sync.responseText);
			}
		}
		catch (exc) {
			// do nothing
		}
		sync_resync = true;
		sync_error_count++;
		if (sync_error_count > 2) {
			ErrorHandler.remove_permanent_error("sync_retrying");
			var e = ErrorHandler.make_error("sync_stopped", 500);
			if (result && result.sync_result && result.sync_result.tl_key) {
				e.text += " (" + $l(result.sync_result.tl_key) + ")";
			}
			else if (result && result.error && result.error.tl_key) {
				e.text += " (" + $l(result.error.tl_key) + ")";	
			}
			else if (result && result[0] && result[0].error && result[0].error.tl_key) {
				e.text += " (" + $l(result[0].error.tl_key) + ")";	
			}
			else {
				e.text += " (" + $l("lost_connection") + ")";
			}
			ErrorHandler.permanent_error(e);
			self.sync_stop();
		}
		else if (sync_error_count > 1) {
			ErrorHandler.permanent_error(ErrorHandler.make_error("sync_retrying", 408));
			sync_timeout_id = setTimeout(sync_get, 6000);
		}
		else {
			sync_timeout_id = setTimeout(sync_get, 6000);
		}
	};

	var sync_complete = function() {
		clear_sync_timeout_error_removal_timeout();
		if (sync_stopped) {
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

		if (("sync_result" in response) && (response.sync_result.tl_key == "station_offline")) {
			ErrorHandler.permanent_error(response.sync_result);
			offline_ack = true;
			sync_restart_pause = 0;
		}
		else {
			sync_error_count = 0;
			offline_ack = false;
			perform_callbacks(response);
			perform_callbacks({ "_SYNC_COMPLETE": { "complete": true } });
			if ("error" in response) {
				sync_restart_pause = 6000;
				if (response.error.code != 200) {
					sync_stopped = true;
				}
			}
			else {
				clear_sync_timeout_error();
				ErrorHandler.remove_permanent_error("station_offline");
			}
		}

		sync_timeout_id = setTimeout(sync_get, sync_restart_pause);
	};

	self.force_sync = function() {
		if (!MOBILE) {
			sync_clear_timeout();
			sync_stopped = false;
			sync.abort();
			sync_get();
		}
		else {
			if ((async.readyState !== 0) && (async.readyState !== 4)) {
				async.abort();
			}
			mobile_syncing = true;
			self.async_get("info");
		}
	};

	var async_timeout = function() {
		ErrorHandler.permanent_error(ErrorHandler.make_error("sync_stopped", 500));
	};

	var async_error = function() {
		ErrorHandler.permanent_error(ErrorHandler.make_error("async_error", 500));
	};

	var async_complete = function() {
		perform_callbacks(JSON.parse(async.responseText));
		ErrorHandler.remove_permanent_error("async_error");
		if (MOBILE && mobile_syncing) {
			mobile_syncing = false;
			perform_callbacks({ "_SYNC_COMPLETE": { "complete": true } });
			ErrorHandler.remove_permanent_error("mobile_sync_retrying");
		}
		self.async_get();
	};

	self.async_get = function(action, params) {
		if (action) {
			if (!params) params = {};
			async_queue.push({ "action": action, "params": params });
		}
		if ((async.readyState === 0) || (async.readyState === 4)) {
			var to_do = async_queue.shift();
			if (to_do) {
				async.open("POST", url + to_do.action, true);
				async.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				to_do.params.sid = sid;
				to_do.params.user_id = user_id;
				to_do.params.key = api_key;
				async.send(self.serialize(to_do.params));
			}
		}
	};

	var perform_callbacks = function(json) {
		var cb, key;
		try {
			for (key in json) {
				if (key in callbacks) {
					for (cb = 0; cb < callbacks[key].length; cb++) {
						callbacks[key][cb](json[key]);
					}
				}
				for (cb = 0; cb < universal_callbacks.length; cb++) {
					universal_callbacks[cb](key, json[key]);
				}
			}
		}
		catch(err) {
			self.sync_stop();
			ErrorHandler.javascript_error(err, json);
			setTimeout(function() { throw(err) }, 1);
		}
	};

	self.add_callback = function(js_func, api_name) {
		if (!callbacks[api_name]) callbacks[api_name] = [];
		callbacks[api_name].push(js_func);
	};


	self.add_universal_callback = function(js_func) {
		universal_callbacks.push(js_func);
	};

	return self;
}();
