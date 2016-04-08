var RainwaveAPI = function() {
	"use strict";

	// Setup  ************************************************************************************************

	var self = {
		ok: false,
		isSlow: false,
		debug: false
	};

	var _sid, _userID, _apiKey, _host;
	var userIsDJ, currentScheduleID, isOK, hidden, visibilityChange, isHidden;
	var socket, socketStaysClosed, socketIsBusy;
	var socketErrorCount = 0;
	var socketSequentialRequests = 0;
	var requestID = 0;
	var requestQueue = [];
	var sentRequests = [];
	var callbacks = {};
	var noop = function() {};

	var netLatencies, drawLatencies = [];
	var slowNetThreshold = 200;
	var slowDrawThreshold = 400;
	var measuredRequests = [ "album", "artist", "group" ];

	// Module Init  ******************************************************************************************

	self.initialize = function(sid, userID, apiKey, data, host) {
		_sid = sid;
		_userID = userID;
		_apiKey = apiKey;
		_host = host;

		self.on("sched_current", function(json) {
			currentScheduleID = json.id;
		});
		self.on("wsok", function() {
			if (self.debug) console.log("wsok received - auth was good!");
			self.onErrorRemove("sync_retrying");
			self.ok = true;
			isOK = true;

			if (currentScheduleID) {
				if (self.debug) console.log("Socket send - check_sched_current_id with " + currentScheduleID);
				socket.send(JSON.stringify({
					action: "check_sched_current_id",
					sched_id: currentScheduleID
				}));
			}

			nextRequest();
		});
		self.on("wsping", function(json) {
			if (self.debug) console.log("Pinged!");
			socket.send(JSON.stringify({
				action: "wspong",
				timestamp: json.timestamp
			}));
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
		var wshost = (window.location.protocol === "https:") ? "wss://" : "ws://";
		if (_host) {
			wshost += _host;
			if (window.location.port) {
				wshost += ":" + window.location.port;
			}
		}
		else {
			wshost += window.location.host;
		}
		socket = new WebSocket(wshost + "/api4/websocket/" + _sid);
		socket.addEventListener("open", function() {
			if (self.debug) console.log("Socket open.");
			socket.send(JSON.stringify({
				action: "auth",
				user_id: _userID,
				key: _apiKey
			}));

		});
		socket.addEventListener("message", onMessage);
		socket.addEventListener("close", onSocketClose);
		socket.addEventListener("error", onSocketError);
	};

	var closeSocket = function() {
		if (!socket || (socket.readyState === WebSocket.CLOSING) || (socket.readyState === WebSocket.CLOSED)) {
			return;
		}
		socket.close();
		if (self.debug) console.log("Socket closed.");
	};

	var onSocketClose = function() {
		isOK = false;
		self.ok = false;
		if (socketStaysClosed || isHidden) {
			return;
		}
		setTimeout(initSocket, 500);
	};

	var onSocketError = function() {
		if (socketErrorCount > 1) {
			self.onError({ "tl_key": "sync_retrying" });
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

		self.onErrorRemove("sync_retrying");

		var json;
		try {
			 json = JSON.parse(message.data);
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

		if (self.debug) console.log("Socket receive", message.data);

		var asyncRequest, i;
		if (json.message_id) {
			for (i = 0; i < sentRequests.length; i++) {
				if (sentRequests[i].message.message_id === json.message_id.message_id) {
					asyncRequest = sentRequests.splice(i, 1)[0];
					asyncRequest.success = true;
					solveLatency(asyncRequest, netLatencies, slowNetThreshold);
					break;
				}
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

		if (("sync_result" in json) && (json.sync_result.tl_key == "station_offline")) {
			self.onError(json.sync_result);
		}
		else {
			self.onErrorRemove("station_offline");
		}

		performCallbacks(json);

		if (asyncRequest && asyncRequest.success) {
			asyncRequest.onSuccess(json);
			solveLatency(asyncRequest, drawLatencies, slowDrawThreshold);
		}

		nextRequest();
	};

	// Calls To API ******************************************************************************************

	self.onRequestError = null;

	self.request = function(action, params, onSuccess, onError) {
		if (!action) {
			throw("No action specified for Rainwave API request.");
		}
		params = params || {};
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
			socketSequentialRequests = 0;
			return;
		}
		if (!isOK) {
			return;
		}

		socketSequentialRequests++;
		// throttling
		if (socketSequentialRequests > 2) {
			socketSequentialRequests = 0;
			setTimeout(nextRequest, 500);
			return;
		}

		var request = requestQueue.shift();
		request.start = new Date();

		if (sentRequests.length > 10) {
			sentRequests.splice(0, sentRequests.length - 10);
		}
		sentRequests.push(request);

		if (self.debug) console.log("Socket write", request.message);
  		socket.send(JSON.stringify(request.message));
	};

	// Callback Handling *************************************************************************************

	var performCallbacks = function(json) {
		// Make sure any vote results are registered after the schedule has been loaded.
		var alreadyVoted;
		if ("already_voted" in json) {
			alreadyVoted = json.already_voted;
			delete json.already_voted;
		}

		var cb, key;
		for (key in json) {
			if (key in callbacks) {
				for (cb = 0; cb < callbacks[key].length; cb++) {
					callbacks[key][cb](json[key]);
				}
			}
		}

		if ("sched_current" in json) {
			if (self.debug) console.log("Sync complete.");
			performCallbacks({ "_SYNC_SCHEDULE_COMPLETE": true });
		}

		key = "already_voted";
		if (alreadyVoted && (key in callbacks)) {
			for (cb = 0; cb < callbacks[key].length; cb++) {
				callbacks[key][cb](alreadyVoted);
			}
		}
	};

	self.addEventListener = function(apiName, func) {
		if (!callbacks[apiName]) {
			callbacks[apiName] = [];
		}
		callbacks[apiName].push(func);
	};

	self.on = self.addEventListener;

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
