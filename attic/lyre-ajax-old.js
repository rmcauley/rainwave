// Lyre AJAX :: http://rainwave.cc/api/ :: (c) Robert McAuley 2010

function LyreAJAX() {
	var maxid = -1;
	var sync = new XMLHttpRequest();
	var sync_on = false;
	var compatible = 1.0;
	var async = new XMLHttpRequest();
	var sid = 0;
	
	var async_ready = true;
	var async_queue = new Array();
	var callbacks = new Array();
	var urlprefix = "http://substream.rainwave.cc/r3/api/";
	if (RegExp("https?:\/\/([A-Za-z0-9-.]+)?rainwave.cc").test(document.location.href.match)) urlprefix = "/r3/api/";
	
	var that = {};
	
	that.logobj = false;
	that.rw_user_id = 1;
	that.sync_stop = false;
	that.sync_last = 0;
	that.sync_time = 0;
	
	that.setStationID = function(newsid) {
		that.log(0, "Station ID now: " + newsid);
		sid = newsid;
	};
	
	that.setUserId = function(user_id) {
		that.rw_user_id = user_id;
	};
	
	that.clockSync = function(time) {
		return;
	};
	
	that.errorCallback = function(code) {
		return;
	};
	
	that.log = function(code, msg) {
		if (that.logobj !== false) that.logobj.log("Lyre", code, msg);
	};
	
	that.sync_start = function(exparams) {
		if (sync_on === true) return false;
		that.addCallback(that, that.lyreClockHandle, "lyre");
		sync_on = true;
		that.log(0, "Sync start.");
		if (exparams !== "") exparams = "&" + exparams;
		that.sync_get("refresh=full" + exparams);
		return true;
	};
	
	that.sync_get = function(params) {
		var actionurl = that.getActionURL("refresh");
		if (actionurl == false) return;
		var now = new Date();
		now = now.getTime() % 1000000;
		sync.open("GET", urlprefix + actionurl + "?sid=" + sid + "&now=" + now + "&" + "basetime=" + that.sync_last + "&user_id=" + that.rw_user_id + "&" + params, true);
		sync.send(null);
	};
	
	that.sync_complete = function() {
		var response;
		var synctimeout = 1000;
		if ((sync.readyState == 4) && (sync.status == 200)) {
			//log(0, "Sync done.");
			try {
				if (JSON) response = JSON.parse(sync.responseText);
				else eval("response = " + sync.responseText);
			}
			catch(err) {
				that.errorCallback(1001);
			}
			if (response) that.performCallbacks(response);
		}
		else if (sync.readyState == 4) {
			response = [ { error: { code: sync.status, text: "HTTP Error.  Synchronization has stopped." } } ];
			that.performCallbacks(response);
			synctimeout = 5000;
		}
		
		if (response && response[0] && response[0].error && response[0].error.code && (response[0].error.code > 0) && (response[0].error.code <= 10)) {
			synctimeout = 5000;
		}
		
		if (sync.readyState == 4) {
			if ((that.sync_stop == false) && (sync_on == true)) {
				setTimeout(that.sync_get, synctimeout);
			}
			else {
				sync_on = false;
			}
		}
	};
	
	that.lyreClockHandle = function(response) {
		if (response['synctime']) {
			that.sync_last = response['synctime'];
		}
		if (response['time']) {
			that.sync_time = response['time'];
			that.clockSync(that.sync_time);
		}
	};
	
	// Using override is VERY DANGEROUS, don't do it unless you absolutely know what you're doing!
	// It's used internally when performing queued actions, i.e. when the library knows things are good to go
	// but is holding off any calls from jumping the queue.
	that.async_get = function(action, params, override) {
		if (async_ready || override) {
			var actionurl = that.getActionURL(action);
			if (!actionurl) {
				return;
			}
			async_ready = false;
			that.log(0, urlprefix + actionurl + "?act=" + action + "&" + params);
			async.open("GET", urlprefix + actionurl + "?act=" + action + "&" + params, true);
			async.send(null);
		}
		else {
			that.async_queueAdd(action, params);
		}
	};
	
	that.async_complete = function() {
		var response;
		if ((async.readyState == 4) && (async.status == 200)) {
			if (JSON) response = JSON.parse(async.responseText);
			else eval("response = " + async.responseText);
			if (response) that.performCallbacks(response);
		}
		else if (async.readyState == 4) {
			response = { error: { code: async.status, text: "HTTP Error on asynchronous request." } };
			that.performCallbacks(response);
		}
		
		if (async.readyState == 4) {
			if (!that.async_queueCheck(true)) async_ready = true;
		}
	};

	that.async_queueAdd = function(action, params) {
		var temp = {};
		temp['action'] = action;
		temp['params'] = params;
		async_queue.push(temp);
	};

	that.async_queueCheck = function(override) {
		if ((async_queue.length > 0) && (async_ready || override)) {
			that.async_get(async_queue[0]['action'], async_queue[0]['params'], true);
			async_queue.shift();
			return true;
		}
		return false;
	};

	that.getActionURL = function(action) {
		if (action == "poll") return "lyre-longpoll.php";
		if (action == "refresh") return "lyre-longpoll.php";
		if (action == "persistent") return "lyre-persistent.php";
		if (action.indexOf("playlist") == 0) return "lyre-playlist.php";
		if (action.indexOf("live") == 0) return "lyre-live.php";
		if (action.indexOf("oneshot") == 0) return "lyre-live.php";
		if (action == "forcecandidate") return "lyre-live.php";
		if (action.indexOf("admin") == 0) return "lyre-admin.php";
		return "lyre.php";
	};
	
	that.performCallbacks = function(json) {
		var cb, i;
		var sched_synced = false;
		var sched_presynced = false;
		for (var i = 0; i < json.length; i++) {
			for (var j in json[i]) {
				that.log(0, "RECV: " + j);
				if (j.indexOf("sched") == 0) {
					sched_synced = true;
					if (!sched_presynced) {
						that.performCallback({}, "sched_presync");
						sched_presynced = true;
					}
				}
				that.performCallback(json[i][j], j);
			}
		}
		if (sched_synced) that.performCallback({}, "sched_sync");
	};
	
	that.performCallback = function(json, segment) {
		if (callbacks[segment]) {
			// TODO : should probably use (for cb in callbacks[segment] here, but callbacks must go in order
			for (var cb = 0; cb < callbacks[segment].length; cb++) {
				if (callbacks[segment][cb]) {
					//try {
					callbacks[segment][cb].func.call(callbacks[segment][cb].obj, json);
					//}
					/*catch(err) {
						log(1000, "AJAX callback failure, removing callback.");
						callbacks[j].splice(cb, 1);
						i--;
					}*/
				}
			}
		}
	};

	that.addCallback = function(object, method, lyreelement) {
		maxid++;
		if (!callbacks[lyreelement]) callbacks[lyreelement] = [];
		callbacks[lyreelement][maxid] = { obj: object, func: method };
		return maxid;
	};
	
	that.removeCallback = function(lyreelement, cbid) {
		if (callbacks[lyreelement]) {
			if (callbacks[lyreelement][cbid]) {
				callbacks[lyreelement][cbid] = false;
				return true;
			}
		}
		return false;
	}
	
	async.onreadystatechange = that.async_complete;
	sync.onreadystatechange = that.sync_complete;
	
	return that;
};
