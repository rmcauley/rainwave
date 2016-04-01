var RainwaveAPI = function() {
	"use strict";

	// Setup  ************************************************************************************************

	var _sid, _url, _userID, _apiKey;
	var userIsDJ;
	var socket, socketStaysClosed, socketIsBusy;
	var socketErrorCount = 0;
	var getQueue = [];
	var getID = 0;

	var self = {};
	self.ok = false;

	var callbacks = {};
	var known_event_id;

	self.isSlow = false;
	var netLatencies = [];
	var drawLatencies = [];
	var slowNetThreshold = 200;
	var slowDrawThreshold = 400;
	var measuredRequests = [ "album", "artist", "group" ];

	var hidden, visibilityChange;
	if (typeof document.hidden !== "undefined") {
		hidden = "hidden";
		visibilityChange = "visibilitychange";
	}
	else if (typeof document.mozHidden !== "undefined") {
		hidden = "mozHidden";
		visibilityChange = "mozvisibilitychange";
	}
	else if (typeof document.msHidden !== "undefined") {
		hidden = "msHidden";
		visibilityChange = "msvisibilitychange";
	}
	else if (typeof document.webkitHidden !== "undefined") {
		hidden = "webkitHidden";
		visibilityChange = "webkitvisibilitychange";
	}

	var noop = function() {};

	// Module Init  ******************************************************************************************

	self.initialize = function(sid, url, userID, apiKey, data) {
		_sid = sid;
		_url = url;
		_userID = userID;
		_apiKey = apiKey;

		self.addCallback("sched_current", function(json) { known_event_id = json.id; });
		self.addCallback("wsok", function() { self.ok = true; });

		if (data) {
			userIsDJ = data.user && data.user.dj;

			if (data.api_info) {
				// Make sure the clock gets initialized first
				performCallbacks({ "api_info": data.api_info });
			}
		}

		// on mobile browsers
		if ((navigator.userAgent.toLowerCase().indexOf("mobile") !== -1) || (navigator.userAgent.toLowerCase().indexOf("android") !== -1)) {
			// only handle browser minimizing/maximizing on mobile
			document.addEventListener(visibilityChange, onVisibilityChange);
			// set to slow network by default (affects rendering)
			self.isSlow = ((navigator.userAgent.toLowerCase().indexOf("mobile") !== -1) || (navigator.userAgent.toLowerCase().indexOf("android") !== -1));
		}

		initSocket();
	};

	// Socket Functions **************************************************************************************

	var initSocket = function() {
		// TODO: check for socket already open
		socket = new WebSocket("ws://" + _url + "/websocket/" + _sid);
		socket.addEventListener("open", function() {
			socket.send(JSON.stringify({
				message: "auth",
				user_id: _userID,
				key: _apiKey
			}));
			// TODO: add callback for wsok and request off known_last_event
		});
		socket.addEventListener("message", onMessage);
		socket.addEventListener("close", onClose);
		socket.addEventListener("error", onError);
		// we don't use the connecting event
		// socket.addEventListener("connecting", onConnecting);
	};

	var closeSocket = function() {
		// TODO: check if socket is already closed
		socket.close();
	};

	var onClose = function() {
		if (socketStaysClosed) {
			return;
		}
		setTimeout(initSocket, 500);
	};

	var onError = function(event) {
		if (socketErrorCount > 3) {
			handleInternalError("sync_retrying");
		}
		socketErrorCount++;
	};

	// Error Handling ****************************************************************************************

	self.onError = noop;

	// function() {
	// 	// ErrorHandler.permanent_error(ErrorHandler.make_error("sync_retrying", 408));
	// };

	self.forceReconnect = function() {
		if (socketStaysClosed) {
			return;
		}
		closeSocket();
	};

	var handleInternalError = function(textKey) {
		self.onError(textKey);
	};

	var handleAPIError = function(apiObject) {
		// TODO (if tl_key in apiObject onError(tl_key))
	};

	var removeAPIError = function(apiObject) {
		// TODO
	};

	// Visibility Changing ***********************************************************************************

	var onVisibilityChange = function() {
		if (document[hidden]) {
			socketStaysClosed = true;
			closeSocket();
		}
		else {
			socketStaysClosed = false;
			initSocket();
		}
	};

	// Data From API *****************************************************************************************

	var solveLatency = function(asyncRequest, latencies, threshold) {
		var slow = false;
		var avg = 0;
		if (measuredRequests.indexOf(asyncRequest.action) !== -1) {
			latencies.push(new Date() - asyncRequest.start);
			while (latencies.length > 10) {
				latencies.shift();
			}
			for (var i = 0; i < latencies.length; i++) {
				avg += latencies[i];
			}
			avg = avg / latencies.length;
			if (avg > threshold) {
				slow = true;
			}
		}
		self.isSlow = slow;
	};

	var onMessage = function(message) {
		socketErrorCount = 0;

		var asyncRequest, i;
		for (i = 0; i < getQueue.length; i++) {
			if (getQueue[i].message.message_id === message.message_id) {
				asyncRequest = getQueue[i];
				asyncRequest.success = true;
				solveLatency(asyncRequest, netLatencies, slowNetThreshold);
				break;
			}
		}

		var json;
		try {
			 json = JSON.parse(event.data);
		}
		catch (exc) {
			console.error("Response from Rainwave API was not JSON!");
			console.error(message);
			closeSocket();
			if (asyncRequest) {
				asyncRequest.onError();
			}
			return;
		}

		if (!json) {
			console.error("Response from Rainwave API was blank!");
			console.error(message);
			closeSocket();
			if (asyncRequest) {
				asyncRequest.onError();
			}
		}

		if (asyncRequest) {
			for (i in json) {
				if (("success" in json[i]) && !json[i].success) {
					asyncRequest.success = false;
					asyncRequest.onError(json[i]);
				}
			}
			asyncRequest.drawStart = new Date();
		}

		// Make sure any vote results are registered after the schedule has been loaded.
		var alreadyVoted;
		if ("already_voted" in json) {
			alreadyVoted = json.already_voted;
			delete json.already_voted;
		}

		if (("sync_result" in json) && (json.sync_result.tl_key == "station_offline")) {
			handleAPIError(json.sync_result);
		}
		else {
			removeAPIError({ "tl_key": "station_offline" });
		}

		performCallbacks(json);
		performCallbacks({ "_SYNC_COMPLETE": true }); // TODO: Switch to NOT use this!  No wonder shit breaks!
		if ("sched_current" in json) {
			performCallbacks({ "_SYNC_SCHEDULE_COMPLETE": true });
		}

		if (alreadyVoted) {
			performCallbacks({ "already_voted": alreadyVoted });
		}

		if (asyncRequest && asyncRequest.success) {
			asyncRequest.onSuccess(json);
			solveLatency(asyncRequest, drawLatencies, slowDrawThreshold);
		}

		nextGet();
	};

	// Calls To API ******************************************************************************************

	// TODO: set this to tooltip
	self.onGetError = null;

	self.get = function(action, params, onSuccess, onError) {
		params.action = action;
		params.message_id = getID;
		getID++;
		getQueue.push({
			message: params || {},
			onSuccess: onSuccess || noop,
			onError: onError || self.onGetError || noop,
		});
		if (!socketIsBusy) {
			nextGet();
		}
	};

	var nextGet = function() {
		if (!getQueue.length) {
			socketIsBusy = false;
			return;
		}

		getQueue[0].start = new Date();
  		socket.send(JSON.stringify(getQueue[0].message));
	};

	// Callback Handling *************************************************************************************

	var performCallbacks = function(json) {
		var cb, key;
		for (key in json) {
			if (key in callbacks) {
				for (cb = 0; cb < callbacks[key].length; cb++) {
					callbacks[key][cb](json[key]);
				}
			}
		}
	};

	self.addEventListener = function(apiName, func) {
		if (!callbacks[apiName]) {
			callbacks[apiName] = [];
		}
		callbacks[apiName].push(func);
	};

	self.removeEventListener = function(apiName, func) {
		if (!callbacks[apiName]) {
			return;
		}
		// TODO: this part
	};

	self.add_callback = self.addCallback;	// compatibility shim for Rainwave

	return self;
}();
