var RainwaveAPI = function() {
	"use strict";

	// Setup  ************************************************************************************************

	var self = {
		ok: false,
		isSlow: false,
		debug: false,
		throwErrorsOnThrottle: true,
		forceSecure: true
	};

	var _sid, _userID, _apiKey, _host;
	var userIsDJ, currentScheduleID, isOK, isOKTimer, hidden, visibilityChange, isHidden, pingInterval;
	var socket, socketStaysClosed, socketIsBusy, socketNoops, socketOpped;
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
		self.on("wsok", onSocketOK);
		self.on("wserror", onSocketFailure);
		self.on("ping", onPing);

		socketNoops = 0;

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
		var wshost = (window.location.protocol === "https:" || self.forceSecure) ? "wss://" : "ws://";
		if (_host) {
			wshost += _host;
			if (window.location.port) {
				wshost += ":" + window.location.port;
			}
		}
		else {
			wshost += window.location.host;
		}
		if (isOKTimer) {
			clearTimeout(isOKTimer);
		}
		isOKTimer = setTimeout(connectedCheck, 3000);
		socket = new WebSocket(wshost + "/api4/websocket/" + _sid);
		socket.addEventListener("open", function() {
			if (self.debug) console.log("Socket open.");
			socketOpped = false;
			try {
				socket.send(JSON.stringify({
					action: "auth",
					user_id: _userID,
					key: _apiKey
				}));
			}
			catch (exc) {
				console.error("Socket exception while trying to authenticate on socket.");
				console.error(exc);
				onSocketError();
			}
		});
		socket.addEventListener("message", onMessage);
		socket.addEventListener("close", onSocketClose);
		socket.addEventListener("error", onSocketError);
	};

	var connectedCheck = function() {
		if (self.debug) console.log("Couldn't appear to connect.");
		self.forceReconnect();
	};

	var closeSocket = function() {
		if (!socket || (socket.readyState === WebSocket.CLOSING) || (socket.readyState === WebSocket.CLOSED)) {
			return;
		}
		// sometimes depending on browser condition, onSocketClose won't get called for a while
		// therefore it's important to switch isOK to false here *and* in onSocketClose.
		isOK = false;
		self.ok = false;
		if (isOKTimer) {
			clearTimeout(isOKTimer);
			isOKTimer = null;
		}
		if (pingInterval) {
			clearInterval(pingInterval);
			pingInterval = null;
		}
		socket.close();
		if (self.debug) console.log("Socket closed.");
	};

	var onSocketClose = function() {
		isOK = false;
		self.ok = false;
		if (isOKTimer) {
			clearTimeout(isOKTimer);
			isOKTimer = null;
		}
		if (pingInterval) {
			clearInterval(pingInterval);
			pingInterval = null;
		}
		if (socketStaysClosed || isHidden) {
			return;
		}
		if (self.debug) console.log("Socket was closed.");
		if (!socketOpped) {
			socketNoops += 1;
			if (socketNoops >= 5) {
				onSocketError();
			}
		}
		setTimeout(initSocket, 500);
	};

	var onSocketError = function() {
		if (self.debug) console.log("Socket errored.");
		self.onError({ "tl_key": "sync_retrying" });
	};

	var onSocketOK = function() {
		if (self.debug) console.log("wsok received - auth was good!");
		self.onErrorRemove("sync_retrying");
		self.ok = true;
		isOK = true;

		if (!pingInterval) {
			pingInterval = setInterval(ping, 20000);
		}

		if (currentScheduleID) {
			if (self.debug) console.log("Socket send - check_sched_current_id with " + currentScheduleID);
			try {
				socket.send(JSON.stringify({
					action: "check_sched_current_id",
					sched_id: currentScheduleID
				}));
			}
			catch (exc) {
				console.error("Socket exception while trying to check_sched_current_id.");
				console.error(exc);
				onSocketError();
			}
		}

		nextRequest();
	};

	var onSocketFailure = function(error) {
		if (error.tl_key === "auth_failed") {
			console.error("Authorization failed for Rainwave websocket.  Wrong API key/user ID combo.");
			self.onError(error);
			self.closePermanently();
		}
	};

	// Error Handling ****************************************************************************************

	self.onError = noop;
	self.onErrorRemove = noop;
	self.onUnsuccessful = noop;

	self.forceReconnect = function() {
		if (self.debug) console.log("Forcing socket reconnect.");
		if (socketStaysClosed) {
			return;
		}
		closeSocket();
	};

	self.closePermanently = function() {
		if (self.debug) console.log("Forcing socket to be closed.");
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

	// Ping and Pong *****************************************************************************************

	var ping = function() {
		if (self.debug) console.log("Pinging server.");
		self.request("ping");
	};

	var onPing = function() {
		if (self.debug) console.log("Server ping.");
		self.request("pong");
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
		socketOpped = true;
		socketNoops = 0;
		self.onErrorRemove("sync_retrying");
		if (isOKTimer) {
			clearTimeout(isOKTimer);
			isOKTimer = null;
		}

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
					if (self.throwErrorsOnThrottle || (json[i].tl_key !== "websocket_throttle")) {
						if (!asyncRequest.onError(json[i])) {
							self.onUnsuccessful(json[i]);
						}
					}
				}
			}
			asyncRequest.drawStart = new Date();
		}

		if ("sync_result" in json) {
			if (json.sync_result.tl_key == "station_offline") {
				self.onError(json.sync_result);
			}
			else {
				self.onErrorRemove("station_offline");
			}
		}

		performCallbacks(json);

		if (asyncRequest && asyncRequest.success) {
			asyncRequest.onSuccess(json);
			solveLatency(asyncRequest, drawLatencies, slowDrawThreshold);
		}

		nextRequest();
	};

	// Calls To API ******************************************************************************************

	var statelessRequests = [ "ping", "pong" ];

	self.onRequestError = null;

	self.request = function(action, params, onSuccess, onError) {
		if (!action) {
			throw("No action specified for Rainwave API request.");
		}
		params = params || {};
		params.action = action;
		if (("sid" in params) && !params.sid && (params.sid !== 0)) {
			delete params.sid;
		}
		if ((statelessRequests.indexOf(action) !== -1) || !isOK) {
			for (var i = requestQueue.length - 1; i >= 0; i--) {
				if (requestQueue[i].message.action === action) {
					if (self.debug) console.log("Throwing away extra " + requestQueue[i].message.action);
					requestQueue.splice(i, 1);
				}
			}
		}
		requestQueue.push({
			message: params || {},
			onSuccess: onSuccess || noop,
			onError: onError || self.onRequestError || noop
		});
		if (!socketIsBusy && isOK) {
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

		var request = requestQueue[0];
		request.start = new Date();

		if (statelessRequests.indexOf(request.message.action) === -1) {
			request.message.message_id = requestID;
			requestID++;
			if (sentRequests.length > 10) {
				sentRequests.splice(0, sentRequests.length - 10);
			}
		}

		if (isOKTimer) {
			clearTimeout(isOKTimer);
		}
		isOKTimer = setTimeout(function() {
			onRequestTimeout(request);
		}, 4000);

		if (self.debug) console.log("Socket write", request.message);

		var jsonmsg;
		try {
			jsonmsg = JSON.stringify(request.message);
		}
		catch (e) {
			console.error("JSON exception while trying to encode message.");
			console.error(e);
			requestQueue.shift();
			return;
		}

		try {
  			socket.send(jsonmsg);
  			requestQueue.shift();
  			if (request.message.message_id !== undefined) {
				sentRequests.push(request);
			}
  		}
		catch (exc) {
			console.error("Socket exception while trying to send.");
			console.error(exc);
			onSocketError();
		}
	};

	var onRequestTimeout = function(request) {
		if (isOKTimer) {
			isOKTimer = null;
			requestQueue.unshift(request);
			if (self.debug) console.log("Looks like the connection timed out.");
			self.onRequestError({ "tl_key": "lost_connection" });
			self.onError({ "tl_key": "sync_retrying" });
			self.forceReconnect();
		}
	};

	// Callback Handling *************************************************************************************

	var performCallbacks = function(json) {
		// Make sure any vote results are registered after the schedule has been loaded.
		var alreadyVoted;
		var liveVoting;
		if ("already_voted" in json) {
			alreadyVoted = json.already_voted;
			delete json.already_voted;
		}
		if ("live_voting" in json) {
			liveVoting = json.live_voting;
			delete json.live_voting;
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

		key = "live_voting";
		if (liveVoting && (key in callbacks)) {
			for (cb = 0; cb < callbacks[key].length; cb++) {
				callbacks[key][cb](liveVoting);
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
