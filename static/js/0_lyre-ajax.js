// Lyre AJAX :: http://rainwave.cc/api/ :: (c) Robert McAuley 2011

var lyre = function() {
	var maxid = -1;
	var sync = new XMLHttpRequest();
	var sync_on = false;
	var sync_init = false;
	var async = new XMLHttpRequest();
	var sid = 0;
	var errorcount = 0;

	var async_ready = true;
	var async_queue = new Array();
	var callbacks = new Array();
	var urlprefix = "http://rainwave.cc/api4/";

	var rw_user_id = 1;
	var rw_apikey = "";

	var that = {};

	that.catcherrors = false;
	that.sync_stop = false;
	that.sync_time = 0;
	that.sync_extra = {};

	that.setURLPrefix = function(newprefix) {
		urlprefix = newprefix;
	};

	that.setStationID = function(newsid) {
		sid = newsid;
	};

	that.setUserID = function(user_id) {
		rw_user_id = user_id;
	};

	that.setKey = function(key) {
		rw_apikey = key;
	};

	that.clockSync = function(time) {
		return;
	};

	that.errorCallback = function(json) {
		return;
	};

	that.jsErrorCallback = function(caught, json) {
		return;
	};

	// stolen from http://stackoverflow.com/questions/1714786/querystring-encoding-of-a-javascript-object
	that.serialize = function(obj) {
		var str = [];
		for (var p in obj) {
			str.push(p + "=" + encodeURIComponent(obj[p]));
		}
		return str.join("&");
	}

	/*that.deserialize = function(getstring) {
		var obj = {};
		var vars = query.split("&");
		var pair;
		for (var i = 0; i < vars.length; i++) {
			pair = vars[i].split("=");

			obj[pair[0]] = pair[1];
		}
	}*/

	var cloneObject = function() {
		var nobj = {}
		for (var i = 0; i < arguments.length; i++) {
			for (var p in arguments[i]) {
				nobj[p] = arguments[i][p]
			}
		}
		return nobj;
	}

	var lyreClockHandle = function(response) {
		if (response['time']) {
			that.sync_time = response['time'];
			that.clockSync(that.sync_time);
		}
	};

	var sync_get = function(params) {
		if (!params) params = {}
		var actionurl = sync_init ? "init" : "sync"
		var url = urlprefix + actionurl;
		sync.open("POST", url, true)
		sync.onreadystatechange = sync_complete;
		sync.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		var fparams = cloneObject(params, that.sync_extra);
		fparams['sid'] = sid;
		fparams['user_id'] = rw_user_id;
		fparams['key'] = rw_apikey;
		fparams['in_order'] = "true";
		var sfparams = that.serialize(fparams);
		sync.send(sfparams);
	};

	var sync_complete = function() {
		var response;
		var synctimeout = 1000;
		if (that.stop_sync) {
			// do nothing
		}
		else if ((sync.readyState == 4) && (sync.status == 200)) {
			errorcount = 0;
			try {
				if (JSON) response = JSON.parse(sync.responseText);
				else eval("response = " + sync.responseText);
			}
			catch(err) {
				that.errorCallback({ "code": 500, "text": "Error decoding JSON from API." });
			}
			if (response) {
				sync_on = true;
				sync_init = false;
				performCallbacks(response);
			}
		}
		else if (sync.readyState == 4) {
			errorcount++;
			if (errorcount > 1) {
				response = [ { "error": { "code": sync.status, "text": "HTTP Error.  Synchronization has stopped." } } ];
				performCallbacks(response);
			}
			synctimeout = 5000;
		}

		if (response && response[0] && response[0].error && response[0].error.code) {
			if (response[0].error.code == 403) {
				that.sync_stop = true;

			}
			else {
				synctimeout = 5000;
			}
		}

		if (sync.readyState == 4) {
			if (that.sync_stop) {
				sync_on = false;
				sync_stop = false;
			}
			if (sync_on) {
				setTimeout(sync_get, synctimeout);
			}
		}
	};

	var async_complete = function() {
		var response;
		if ((async.readyState == 4) && (async.status == 200)) {
			if (JSON) response = JSON.parse(async.responseText);
			else eval("response = " + async.responseText);
			if (response) performCallbacks(response);
		}
		else if (async.readyState == 4) {
			response = [ { "error": { "code": async.status, "text": "HTTP Error on asynchronous request." } } ];
			performCallbacks(response);
		}

		if (async.readyState == 4) {
			if (!async_queueCheck(true)) async_ready = true;
		}
	};

	var async_queueAdd = function(action, params) {
		var temp = {};
		temp['action'] = action;
		temp['params'] = params;
		async_queue.push(temp);
	};

	var async_queueCheck = function(override) {
		if ((async_queue.length > 0) && (async_ready || override)) {
			that.async_get(async_queue[0]['action'], async_queue[0]['params'], true);
			async_queue.shift();
			return true;
		}
		return false;
	};

	var performCallbacks = function(json) {
		var cb, i;
		var sched_synced = false;
		var sched_presynced = false;
		for (var i = 0; i < json.length; i++) {
			for (var j in json[i]) {
				if (j.indexOf("sched") == 0) {
					sched_synced = true;
					if (!sched_presynced) {
						performCallback({}, "sched_presync");
						sched_presynced = true;
					}
				}
				performCallback(json[i][j], j);
			}
		}
		if (sched_synced) performCallback({}, "sched_sync");
	};

	var performCallback = function(json, segment) {
		if (callbacks[segment]) {
			for (var cb = 0; cb < callbacks[segment].length; cb++) {
				if (callbacks[segment][cb]) {
					if (that.catcherrors) {
						try {
							callbacks[segment][cb](json);
						}
						catch(err) {
							that.jsErrorCallback(err, json);
							that.sync_stop = true;
							return;
						}
					}
					else {
						callbacks[segment][cb](json);
					}
				}
			}
		}
	};

	that.sync_start = function(initial_payload) {
		if (sync_on === true) return false;
		performCallbacks(initial_payload);
		sync_get();
	};

	// Using override is VERY DANGEROUS, don't do it unless you absolutely know what you're doing!
	// It's used internally when performing queued actions, i.e. when the library knows things are good to go
	// but is holding off any calls from jumping the queue.
	that.async_get = function(action, params, override) {
		if (!params) params = {}
		if (async_ready || override) {
			async_ready = false;
			async.open("POST", urlprefix + action, true);
			async.onreadystatechange = async_complete;
			async.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
			var fparams = cloneObject(params)
			fparams['sid'] = sid
			fparams['user_id'] = rw_user_id;
			fparams['key'] = rw_apikey;
			fparams['in_order'] = "true";
			async.send(that.serialize(fparams));
		}
		else {
			async_queueAdd(action, params);
		}
	};

	that.addCallback = function(method, lyreelement) {
		maxid++;
		if (!callbacks[lyreelement]) callbacks[lyreelement] = [];
		callbacks[lyreelement][maxid] = method;
		return maxid;
	};

	that.removeCallback = function(lyreelement, cbid) {
		if (callbacks[lyreelement]) {
			if (callbacks[lyreelement][cbid]) {
				delete(callbacks[lyreelement][cbid]);
				return true;
			}
		}
		return false;
	}

	that.addCallback(lyreClockHandle, "api_info");

	return that;
}();
