var RainwaveAPI = function() {
	"use strict";

	// Setup  ************************************************************************************************

	var self = {
		ok: false,
		isSlow: false
	};

	var _sid, _url, _userID, _apiKey;
	var userIsDJ, currentScheduleID, isOK, hidden, visibilityChange, isHidden;
	var socket, socketStaysClosed, socketIsBusy;
	var socketErrorCount = 0;
	var requestID = 0;
	var requestQueue = [];
	var callbacks = {};
	var noop = function() {};

	var netLatencies, drawLatencies = [];
	var slowNetThreshold = 200;
	var slowDrawThreshold = 400;
	var measuredRequests = [ "album", "artist", "group" ];

	// Module Init  ******************************************************************************************

	self.initialize = function(sid, url, userID, apiKey, data) {
		_sid = sid;
		_url = url;
		_userID = userID;
		_apiKey = apiKey;

		self.addCallback("sched_current", function(json) {
			currentScheduleID = json.id;
		});
		self.addCallback("wsok", function() {
			self.ok = true;
			isOK = true;
			nextRequest();

			if (currentScheduleID) {
				socket.send(JSON.stringify({
					action: "check_sched_current_id",
					sched_id: currentScheduleID
				}));
			}
		});

		if (data) {
			userIsDJ = data.user && data.user.dj;
			if (data.api_info) {
				// This will initialize any clocks first, since this contains the server time
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

		if (data) {
			performCallbacks(data);
		}

		initSocket();
	};

	// Socket Functions **************************************************************************************

	var initSocket = function() {
		if (socket && (socket.readyState === WebSocket.OPEN)) {
			return;
		}
		socket = new WebSocket("ws://" + _url + "/websocket/" + _sid);
		socket.addEventListener("open", function() {
			socket.send(JSON.stringify({
				message: "auth",
				user_id: _userID,
				key: _apiKey
			}));
		});
		socket.addEventListener("message", onMessage);
		socket.addEventListener("close", onClose);
		socket.addEventListener("error", onError);
	};

	var closeSocket = function() {
		if (!socket || (socket.readyState === WebSocket.CLOSING) || (socket.readyState === WebSocket.CLOSED)) {
			return;
		}
		socket.close();
	};

	var onClose = function() {
		if (socketStaysClosed || isHidden) {
			return;
		}
		setTimeout(initSocket, 500);
	};

	var onError = function(event) {
		if (socketErrorCount > 3) {
			onError({ "wserror": { "tl_key": "sync_retrying" } });
		}
		socketErrorCount++;
	};

	// Error Handling ****************************************************************************************

	self.onError = noop;
	self.onErrorRemove = noop;

	self.forceReconnect = function() {
		if (socketStaysClosed) {
			return;
		}
		closeSocket();
	};

	self.closePermanently = function() {
		socketStaysClosed = true;
		closeSocket();
	};

	// Visibility Changing ***********************************************************************************

	if (typeof document.hidden !== "undefined") {
		hidden = "hidden";
		visibilityChange = "visibilitychange";
	}
	else if (typeof document.webkitHidden !== "undefined") {
		hidden = "webkitHidden";
		visibilityChange = "webkitvisibilitychange";
	}

	var onVisibilityChange = function() {
		if (document[hidden]) {
			isHidden = true;
			closeSocket();
		}
		else {
			isHidden = false;
			initSocket();
		}
	};

	// Data From API *****************************************************************************************

	var solveLatency = function(asyncRequest, latencies, threshold) {
		var i, avg = 0;
		if (measuredRequests.indexOf(asyncRequest.action) !== -1) {
			latencies.push(new Date() - asyncRequest.start);
			while (latencies.length > 10) {
				latencies.shift();
			}
			for (i = 0; i < latencies.length; i++) {
				avg += latencies[i];
			}
			avg = avg / latencies.length;
			self.slow = avg > threshold;
		}
	};

	var onMessage = function(message) {
		socketErrorCount = 0;

		var asyncRequest, i;
		for (i = 0; i < requestQueue.length; i++) {
			if (requestQueue[i].message.message_id === message.message_id) {
				asyncRequest = requestQueue[i];
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
					if (!asyncRequest.onError(json[i])) {
						self.onError(json[i]);
					}
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
			self.onError(json.sync_result);
		}
		else {
			self.onErrorRemove("station_offline");
		}

		performCallbacks(json);

		if (alreadyVoted) {
			performCallbacks({ "already_voted": alreadyVoted });
		}

		if ("sched_current" in json) {
			performCallbacks({ "_SYNC_SCHEDULE_COMPLETE": true });
		}

		if (asyncRequest && asyncRequest.success) {
			asyncRequest.onSuccess(json);
			solveLatency(asyncRequest, drawLatencies, slowDrawThreshold);
		}

		nextRequest();
	};

	// Calls To API ******************************************************************************************

	self.onRequestError = null;

	self.request = function(action, params, onSuccess, onError) {
		params.action = action;
		params.message_id = requestID;
		requestID++;
		requestQueue.push({
			message: params || {},
			onSuccess: onSuccess || noop,
			onError: onError || self.onRequestError || noop,
		});
		if (!socketIsBusy || !isOK) {
			nextRequest();
		}
	};

	var nextRequest = function() {
		if (!requestQueue.length) {
			socketIsBusy = false;
			return;
		}
		if (!isOK) {
			return;
		}

		requestQueue[0].start = new Date();
  		socket.send(JSON.stringify(requestQueue[0].message));
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
		while (callbacks[apiName].indexOf(apiName) !== -1) {
			callbacks[apiName].splice(callbacks[apiName].indexOf(apiName), 1);
		}
	};

	return self;
}();
