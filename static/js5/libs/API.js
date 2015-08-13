var API = function() {
	"use strict";
	var sid, url, user_id, api_key;
	var sync, sync_params, sync_stopped, sync_timeout_id, sync_error_count, sync_resync;
	var sync_timeout_error_removal_timeout;
	var async, async_queue, async_current;
	var callbacks = {};
	var offline_ack = false;
	var known_event_id = 0;

	var self = {};
	self.last_action = null;
	self.paused = false;

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
		self.add_callback("sched_current", function(json) { known_event_id = json.id; });

		// Make sure the clock gets initialized first
		perform_callbacks({ "api_info": json.api_info });

		// Call back the heavy playlist functions first
		// This will prevent animation hitching
		var lists = [ "all_albums", "all_artists", "current_listeners", "request_line" ];
		var temp_json;
		for (var i = 0; i < lists.length; i++) {
			if (lists[i] in json) {
				temp_json = {};
				temp_json[lists[i]] = json[lists[i]];
				perform_callbacks(temp_json);
				delete(json[lists[i]]);
			}
		}

		perform_callbacks({ "_SYNC_START": true });
		perform_callbacks(json);
		perform_callbacks({ "_SYNC_COMPLETE": true });
		// Make sure any vote results are registered now (after the schedule has been loaded)
		if ("already_voted" in json) {
			perform_callbacks({ "already_voted": json.already_voted });
		}

		// only handle browser closing/opening on mobile
		if (visibilityEventNames && visibilityEventNames.change && document.addEventListener) {
			if ((navigator.userAgent.toLowerCase().indexOf("mobile") !== -1) || (navigator.userAgent.toLowerCase().indexOf("android") !== -1)) {
				document.addEventListener(visibilityEventNames.change, handle_visibility_change, false);
			}
		}

		sync_get();
	};

	var handle_visibility_change = function() {
		if (!sync_stopped) return;
		if (document[visibilityEventNames.hidden]) {
			sync_pause();
		}
		else {
			sync_get();
		}
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

	var sync_pause = function() {
		clear_sync_timeout_error_removal_timeout();
		sync_clear_timeout();
		sync_stopped = true;
		sync.abort();
	};

	self.sync_stop = function() {
		sync_pause();
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
		if (sync_error_count > 4) {
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

	var check_sync_results = function(response) {
		if ("info_result" in response) {
			response.sync_result = response.info_result;
		}
		if (("sync_result" in response) && (response.sync_result.tl_key == "station_offline")) {
			ErrorHandler.permanent_error(response.sync_result);
			offline_ack = true;
			self.paused = false;
			return true;
		}
		else {
			ErrorHandler.remove_permanent_error("station_offline");
		}
		if (("sync_result" in response) && (response.sync_result.tl_key == "station_paused")) {
			self.paused = true;
			offline_ack = true;
			return true;
		}
		return false;
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

		if (check_sync_results(response)) {
			sync_restart_pause = 0;
		}
		else {
			self.paused = false;
			sync_error_count = 0;
			offline_ack = false;
			perform_callbacks({ "_SYNC_START": true });
			perform_callbacks(response);
			perform_callbacks({ "_SYNC_COMPLETE": true });
			if ("error" in response) {
				sync_restart_pause = 6000;
				if (response.error.code != 200) {
					sync_stopped = true;
				}
			}
			else {
				clear_sync_timeout_error();
			}
		}

		sync_timeout_id = setTimeout(sync_get, sync_restart_pause);
	};

	self.force_sync = function() {
		sync_pause();
		sync_get();
	};

	self.sync_status = function() {
		console.log(sync);
		console.log(sync_stopped);
		console.log(sync_error_count);
	};

	var async_timeout = function() {
		ErrorHandler.permanent_error(ErrorHandler.make_error("sync_stopped", 500));
		self.async_get();
	};

	var async_error = function() {
		var json;
		if (async.responseText === "json") {
			json = async.response;
		}
		var do_default = true;
		if (async_current.error_callback) {
			if (async_current.error_callback(json)) do_default = false;
		}
		if (do_default && json) {
			ErrorHandler.tooltip_error(json);
		}
		else if (do_default) {
			ErrorHandler.tooltip_error(ErrorHandler.make_error("async_error", async.status));
		}
		self.async_get();
	};

	var async_complete = function() {
		ErrorHandler.remove_permanent_error("async_error");
		var json;
		if (async.responseType === "json") {
			json = async.response;
		}
		else {
			try {
				json = JSON.parse(async.response);
			}
			catch(e) {
				// nothing
			}
		}

		if (!json) {
			return async_error();
		}

		for (var i in json) {
			if (("success" in json[i]) && !json[i].success) {
				return async_error();
			}
		}

		perform_callbacks(json);
		if (async_current.callback) {
			async_current.callback(json);
		}
		
		async_current = null;
		self.async_get();
	};

	self.async_get = function(action, params, callback, error_callback) {
		if (action) {
			if (!params) params = {};
			async_queue.push({ "action": action, "params": params, "callback": callback, "error_callback": error_callback });
		}
		if ((async.readyState === 0) || (async.readyState === 4)) {
			async_current = async_queue.shift();
			if (async_current) {
				self.last_action = { "action": async_current.action, "params": async_current.params };
				async.open("POST", url + async_current.action, true);
				async.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
				if (!async_current.params.sid) async_current.params.sid = sid;
				async_current.params.user_id = user_id;
				async_current.params.key = api_key;
				async.send(self.serialize(async_current.params));
			}
		}
	};

	self.async_status = function() {
		console.log(async);
		console.log(async.readyState);
		console.log(async_queue);
		console.log(async_current);
		console.log("paused? " + self.paused);
	};

	var perform_callbacks = function(json) {
		var cb, key;
		for (key in json) {
			if (key in callbacks) {
				for (cb = 0; cb < callbacks[key].length; cb++) {
					callbacks[key][cb](json[key]);
				}
			}
		}
	};

	self.add_callback = function(api_name, js_func) {
		if (!callbacks[api_name]) callbacks[api_name] = [];
		callbacks[api_name].push(js_func);
	};

	return self;
}();
