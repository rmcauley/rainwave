var RainwavePlayer = function() {
	"use strict";

	var callbacks = {
		"playing": [],
		"stop": [],
		"change": [],
		"volumeChange": [],
		"loading": [],
		"stall": [],
		"error": [],
		"longLoadWarning": []
	};

	var hardcodedStations = {
		1: [{"hostname": "gamestream.rainwave.cc", "protocol": "http://", "name": "Random", "port": "8000", "mount": "game" }],
		2: [{"hostname": "ocrstream.rainwave.cc", "protocol": "http://", "name": "Random", "port": "8000", "mount": "ocremix" }],
		3: [{"hostname": "coverstream.rainwave.cc", "protocol": "http://", "name": "Random", "port": "8000", "mount": "covers" }],
		4: [{"hostname": "chipstream.rainwave.cc", "protocol": "http://", "name": "Random", "port": "8000", "mount": "chiptune" }],
		5: [{"hostname": "allstream.rainwave.cc", "protocol": "http://", "name": "Random", "port": "8000", "mount": "all" }]
	};

	var hardcodedStationToSID = {
		"game": 1,
		"ocr": 2,
		"ocremix": 2,
		"oc remix": 2,
		"cover": 3,
		"covers": 3,
		"chip": 4,
		"chiptune": 4,
		"chiptunes": 4,
		"all": 5
	};

	var self = {};
	self.supported = false;
	self.type = null;
	self.audioElDest = false;
	self.playingStatus = false;
	self.volume = 1.0;
	self.defaultVolume = 1.0;
	self.isMuted = false;

	var filetype;
	var streamURLs = [];
	var isMobile = (navigator.userAgent.toLowerCase.indexOf("mobile") !== -1) || (navigator.userAgent.toLowerCase.indexOf("android") !== -1);

	// Chrome on mobile has a really nasty habit of stalling AFTER playback has started
	// And also taking AGES to start the actual playback.
	// We use this flag in a few places to stop Chrome from murdering itself on mobile
	var chromeSpecialFlag = false;

	var audioEl = document.createElement("audio");
	if ("canPlayType" in audioEl) {
		var canVorbis = false;
		if (isMobile) {
			// avoid using Vorbis on mobile devices, since MP3 playback has hardware decoding
		}
		else if (navigator.userAgent.indexOf("CrKey") !== -1) {
			// avoid obscure forms of Chromium and Chromium based browsers
		}
		else {
			canVorbis = audioEl.canPlayType("audio/ogg; codecs=\"vorbis\"");
		}

		// we have to check for Mozilla support specifically with vorbis.
		// Webkit will choke on Vorbis and stop playing after
		// a single song switch, and thus, we have to forcefeed it MP3.
		// Check for Mozilla by looking for really specific moz-prefixed properties.
		if ((navigator.mozIsLocallyAvailable || navigator.mozApps || navigator.mozContacts) && ((canVorbis == "maybe") || (canVorbis == "probably"))) {
			filetype = "audio/ogg";
			self.type = "Vorbis";
			self.supported = true;
		}

		var canMP3 = audioEl.canPlayType("audio/mpeg; codecs=\"mp3\"");
		if (!self.supported && (canMP3 == "maybe") || (canMP3 == "probably")) {
			filetype = "audio/mpeg";
			self.type = "MP3";
			self.supported = true;
		}

		if ((navigator.userAgent.indexOf("Chrome") > -1) && (navigator.userAgent.indexOf("Android") > -1)) {
			chromeSpecialFlag = true;
		}
	}
	audioEl = null;

	var setupAudio = function() {
		if (audioEl) {
			// self.stop calls setupAudio, be sure to return here.
			return self.stop();
		}
		self.playingStatus = false;
		audioEl = document.createElement("audio");
		audioEl.addEventListener("stop", onStop);
		audioEl.addEventListener("playing", onPlay);		// do not use "play" - it must be "playing"!!
		audioEl.addEventListener("stalled", onStall);
		audioEl.addEventListener("waiting", onWaiting);
		audioEl.volume = self.volume || self.defaultVolume;
		// the audio element has to be appended in some instances or it gets flagged as spam attempt
		(self.audioElDest || document.body).appendChild(audioEl);
	};

	var setupAudioSource = function(i, stream_url) {
		var source = document.createElement("source");
		source.setAttribute("src", stream_url);
		source.setAttribute("type", filetype);
		// source.addEventListener("playing", self.on_play);			// doesn't work
		if (i == stream_urls.length - 1) {
			source.addEventListener("error", self.on_error);
		}
		else {
			source.addEventListener("error", function(e) {
				self.onStall(e, i);
			});
		}
		return source;
	};

	self.playStop = function(evt) {
		if (self.playingStatus) self.stop(evt);
		else self.play(evt);
	};

	self.play = function(evt) {
		if (!self.supported) {
			console.error("Rainwave HTML5 Audio Playback not supported on this browser.");
			return;
		}

		if (!self.playingStatus) {
			if (ErrorHandler && chromeSpecialFlag) {
				self.dispatchEvent(new Event("longLoadWarning"));
			}

			for (var i = 0; i < stream_urls.length; i++) {
				audioEl.appendChild(setupAudioSource(i, stream_urls[i]));
			}
		}

		if (!self.playingStatus) {
			audioEl.play();
			self.playingStatus = true;
			self.dispatchEvent(new Event("playing"));
			self.dispatchEvent(new Event("change"));
		}
	};

	self.stop = function(evt) {
		if (!self.supported) return;

		while (audioEl.firstChild) {
			audioEl.removeChild(audioEl.firstChild);
		}
		if (audioEl.parentNode) {
			audioEl.parentNode.removeChild(audioEl);
		}
		audioEl.pause(0);					// I forget why I specified the 0 initially
		audioEl.removeAttribute("src");		// nuke all traces of a source from orbit
		try {
			// removing all the <source> elements first and then loading stops the
			// browser from streaming entirely.  anything short of that
			// and the browser will continue to stream in the background, piling up a massive
			// audio buffer. (or multiple if we're not careful!)
			audioEl.load();
		}
		catch (e) {
			// do nothing, we WANT it to fail
		}
		audioEl = null;
		setupAudio();
		self.dispatchEvent(new Event("stop"));
		self.dispatchEvent(new Event("change"));
	};

	self.toggleMute = function() {
		if (self.isMuted) {
			self.isMuted = false;
			if (audioEl) {
				audioEl.volume = self.volume || self.defaultVolume;
			}
			self.dispatchEvent(new Event("volumeChange"));
		}
		else {
			self.isMuted = true;
			if (audioEl) {
				audioEl.volume = 0;
			}
			self.dispatchEvent(new Event("volumeChange"));
		}
	};

	var onConnecting = function() {
		self.dispatchEvent(new Event("loading"));
	};

	var onPlay = function() {
		self.dispatchEvent(new Event("playing"));
		self.dispatchEvent(new Event("change"));
	};

	// the stall-related functions have a timeout in order
	// to workaround browser issues that report stalls for VERY brief
	// moments (often 50-70ms).
	// don't let these escape the library unless there's an actual problem.

	var stall_timeout;
	var stopAudioConnectError = function() {
		if (stall_timeout) {
			clearTimeout(stall_timeout);
			stall_timeout = null;
		}
	};
	var doAudioConnectError = function(detail) {
		if (stall_timeout) {
			return;
		}
		stall_timeout = setTimeout(function() {
			var evt = new Event("stall");
			evt.detail = detail;
			self.dispatchEvent(detail);
			stall_timeout = null;
		}, 1500);
	};

	var onStall = function(e, i) {
		// we need to handle stalls from sources (which have an index)
		// and stalls from the audio element themselves in this function
		// we handle sources so that we know how bad things are.
		// we give errors such as "3/5 sources have failed."

		if (i !== undefined) {
			// this is a source stall
		}
		else if (chromeSpecialFlag) {
			// we can ignore audio element stalls when Chrome is being special
			// because it is forever stalled for some reason. :/
			return;
		}

		var detail;
		if (i !== undefined) {
			detail = " (" + (i + 1) + "/" + stream_urls.length + ")";
		}
		doAudioConnectError(detail);
	};

	self.onError = function(e) {
		stopAudioConnectError();
		self.stop();
		self.dispatchEvent(new Event("error"));
	};

	self.dispatchEvent = function(evt) {
		if (!callbacks[evt.type]) {
			return;
		}
		for (var i = 0; i < callbacks[evt.type].length; i++) {
			callback(callbacks[evt.type][i]);
		}
	};

	self.addEventListener = function(evtname, callback) {
		if (!callbacks[evtname]) {
			console.error(evtname + " is not a supported event for the Rainwave Player.");
			return;
		}
		callbacks[evtname].push(callback);
	};

	self.removeEventListener = function(evtname, callback) {
		if (!callbacks[evtname]) {
			return;
		}
		while (callbacks[evtname].indexOf(callback) !== -1) {
			callbacks[evtname].splice(callbacks[evtname].indexOf(callback), 1);
		}
	};

	return self;
}();
