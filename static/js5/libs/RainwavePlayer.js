/*

RainwavePlayer - http://github.com/rmcauley/rainwave_player

A library to mask the <audio> element and the difficulties of streaming in HTML5.

Synopsis:

------------

if (!RainwavePlayer.isSupported) {
	alert("No HTML5 audio support!");
}
else {
	RainwavePlayer.useStation("Game");
	RainwavePlayer.addEventListener("error", function() { alert("The RainwavePlayer stopped working!") });
	RainwavePlayer.play();
	stopButton.addEventListener("click", RainwavePlayer.stop);
}

------------

Functions:

useStation(station)  : Accepts station IDs or station names to setup audio sources. (e.g. "All")
useStreamURLs(array) : An array of source URL strings.
playToggle()         : Stops/starts playback.
play()               : Starts playback.
stop()               : Stops playback.
toggleMute()         : Toggles mute.
setVolume(newVolume) : Sets volume.  Must be between 0.0 and 1.0.

------------

Events:

The following events can be emitted by the library:
	- "playing" is emitted when the audio starts playing, or resumes after a stall
	- "stop" when the audio has been completely shutdown
	- "change" on playing or stop, status can be checked with RainwavePlayer.isPlaying
	- "volumeChange" triggers on setVolume(), mute (volume will === 0), and unmute
	- "loading" when the stream is initializing
	- "stall" when the stream has a hiccup.  (warning: can be thrown more than once for one stall!)
	- "error" when the audio playback fails (this is 99% of the time network issues)
	- "longLoadWarning" when the library thinks the <audio> element will take >20 seconds to start

Events do not have any detail associated with them, except stall, which will provide a string
as event.detail with the reason for the stall.

Note about "stall": the browser can throw its own stall events many times, repeatedly, before
it will revert to "playing" or "stop".  Please make sure you have your own code setup
to handle repeated errors!

------------

Setters:

audioElDest   : Optional for compaibility - what DOM element to place the <audio> tag in.
                Set this to be somewhere on your page, even if visiblity: hidden or
                outside the browser's viewport, to avoid trouble with some browsers.
                If you forget to define it, the library will generate a <div> to use but
                will not append it anywhere on the page.

Getters/Properties:

isSupported   : Boolean: Can the browser play back HTML5 audio?
isPlaying     : Boolean: Is the library playing/trying to play (true) or stopped? (false)
isMuted       : Boolean.
type          : String : What kind of audio does the browser support: "Vorbis" or "MP3"?
mimetype      : String : MIME type of the string.
volume        : Number : 0.0 to 1.0. 0.0 during mute.

All properties can be changed, but please don't.  You'll break your own player. :)
They're exposed for rare edge cases where you may want to override what the
player is doing, if you're so confident as to do such.

*/

var RainwavePlayer = function() {
	"use strict";

	// callback registries
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

	// if the RainwaveAPI interface is not available, we can fallback to round robin relays
	var hardcodedStations = {
		1: [ "http://gamestream.rainwave.cc:8000/game" ],
		2: [ "http://ocrstream.rainwave.cc:8000/ocremix" ],
		3: [ "http://overstream.rainwave.cc:8000/covers" ],
		4: [ "http://chipstream.rainwave.cc:8000/chiptune" ],
		5: [ "http://allstream.rainwave.cc:8000/all" ]
	};

	// these friendly names make it easier to use the library as opposed to remembering numbers
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
	self.isSupported = false;
	self.type = null;
	self.audioElDest = false;
	self.isPlaying = false;
	self.volume = 1.0;
	self.isMuted = false;
	self.mimetype = "";

	var streamURLs = [];
	var volumeBeforeMute = 1.0;
	var isMobile = (navigator.userAgent.toLowerCase().indexOf("mobile") !== -1) || (navigator.userAgent.toLowerCase().indexOf("android") !== -1);

	// Chrome on mobile has a really nasty habit of stalling AFTER playback has started
	// And also taking AGES to start the actual playback.
	// We use this flag in a few places to stop Chrome from murdering itself on mobile
	var chromeSpecialFlag = false;

	var createEvent = function(eventType) {
		try {
			return new Event(eventType);
		}
		catch(e) {
			return { "type": eventType };
		}
	};

	// *******************************************************************************************
	//	Initialization And Detection
	// *******************************************************************************************

	var audioEl = document.createElement("audio");
	if ("canPlayType" in audioEl) {
		var canVorbis = false;
		if (isMobile) {
			// avoid using Vorbis on mobile devices, since MP3 playback has hardware decoding
		}
		else {
			canVorbis = audioEl.canPlayType("audio/ogg; codecs=\"vorbis\"");
		}

		// we have to check for Mozilla support specifically for Vorbis.
		// Webkit/Blink, esp. older ones, will choke on Vorbis and stop playing after
		// a single song switch, and thus, we have to forcefeed it MP3.
		// Check for Mozilla by looking for really specific moz-prefixed properties.
		if ((navigator.mozIsLocallyAvailable || navigator.mozApps || navigator.mozContacts) && ((canVorbis == "maybe") || (canVorbis == "probably"))) {
			self.mimetype = "audio/ogg";
			self.type = "ogg";
			self.isSupported = true;
		}

		var canMP3 = audioEl.canPlayType("audio/mpeg; codecs=\"mp3\"");
		if (!self.isSupported && (canMP3 == "maybe") || (canMP3 == "probably")) {
			self.mimetype = "audio/mpeg";
			self.type = "mp3";
			self.isSupported = true;
		}

		// see variable definition of chromeSpecialFlag on why we need to do this
		if ((navigator.userAgent.indexOf("Chrome") > -1) && (navigator.userAgent.indexOf("Android") > -1)) {
			chromeSpecialFlag = true;
		}
	}
	audioEl = null;

	// *******************************************************************************************
	//	Private Functions
	// *******************************************************************************************

	var setupAudio = function() {
		if (audioEl) {
			// why call stop: we might still be playing if audioEl is not null.
			// self.stop will recursively call setupAudio though, so you MUST return here
			// to avoid an infinite loop.
			return self.stop();
		}
		self.isPlaying = false;
		audioEl = document.createElement("audio");
		audioEl.addEventListener("stop", onStop);
		audioEl.addEventListener("playing", onPlay);		// do not use "play" - it must be "playing"!!
		audioEl.addEventListener("stalled", onStall);
		audioEl.addEventListener("waiting", onWaiting);
		audioEl.volume = self.volume;
		if (!self.audioElDest) {
			self.audioElDest = document.createElement("div");
		}
		self.audioElDest.appendChild(audioEl);
	};

	var setupAudioSource = function(i, stream_url) {
		var source = document.createElement("source");
		source.setAttribute("src", stream_url);
		source.setAttribute("type", self.mimetype);

		// source.addEventListener("playing", self.on_play);			// doesn't work

		// on the final <source> of the audio stream, we throw an error event
		// as the browser will stop trying to play audio
		if (i == streamURLs.length - 1) {
			source.addEventListener("error", onError);
		}
		// otherwise, have it throw a stall
		// (sometimes the source will stall, other times <audio>, sometimes BOTH)
		else {
			source.addEventListener("error", function(e) {
				onStall(e, i);
			});
		}
		return source;
	};

	// *******************************************************************************************
	//	Public Functions
	// *******************************************************************************************

	/**
	 * Sets up the library to use a particular Rainwave station.
	 * @param {(number|string)} station - Rainwave Station ID or Rainwave Station Name.
	 */
	self.useStation = function(station) {
		if (isNaN(parseInt(station)) || !hardcodedStations[parseInt(station)]) {
			if (station.toLowerCase && hardcodedStationToSID[station.toLowerCase()]) {
				station = hardcodedStationToSID[station.toLowerCase()];
			}
			else {
				console.warn("Unknown Rainwave Station " + station + ", defaulting to All.");
				station = 5;
			}
		}

		streamURLs = [ hardcodedStations[station] + "." + self.type ];
	};

	/**
	 * Sets up the libray to use a list of stream URLs.
	 * @param {string[]} newURLs - An array of stream URLs.
	 */
	self.useStreamURLs = function(newURLs) {
		streamURLs = newURLs;
	};

	/**
	 * Toggles between playing and stopped.
	 */
	self.playToggle = function() {
		if (self.isPlaying) self.stop();
		else self.play();
	};

	/**
	 * Start playback.
	 */
	self.play = function() {
		if (!self.isSupported) {
			console.error("Rainwave HTML5 Audio Playback is not supported on this browser.");
			return;
		}

		if (!self.isPlaying) {
			if (!audioEl) {
				setupAudio();
			}
			if (chromeSpecialFlag) {
				self.dispatchEvent();
			}

			for (var i = 0; i < streamURLs.length; i++) {
				audioEl.appendChild(setupAudioSource(i, streamURLs[i]));
			}

			audioEl.play();
			self.isPlaying = true;
			self.dispatchEvent(createEvent("playing"));
			self.dispatchEvent(createEvent("change"));
		}
	};

	/**
	 * Stop playback.
	 */
	self.stop = function() {
		if (!self.isSupported) return;
		if (!audioEl) return;

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
			// audio buffer.
			audioEl.load();
		}
		catch (e) {
			// do nothing, we WANT it to fail
		}
		audioEl = null;
		setupAudio();
		self.dispatchEvent(createEvent("stop"));
		self.dispatchEvent(createEvent("change"));
	};

	/**
	 * Toggle mute.
	 */
	self.toggleMute = function() {
		if (self.isMuted) {
			self.isMuted = false;
			if (audioEl) {
				audioEl.volume = volumeBeforeMute || self.volume;
			}
			self.volume = volumeBeforeMute;
			self.dispatchEvent(createEvent("volumeChange"));
		}
		else {
			self.isMuted = true;
			volumeBeforeMute = self.volume;
			self.volume = 0;
			if (audioEl) {
				audioEl.volume = 0;
			}
			self.dispatchEvent(createEvent("volumeChange"));
		}
	};

	/**
	 * Set volume.
	 * @param {number} newVolume - 0.0 to 1.0
	 */
	self.setVolume = function(newVolume) {
		if (self.isMuted) {
			volumeBeforeMute = newVolume;
			return;
		}
		self.volume = newVolume;
		if (audioEl) {
			audioEl.volume = newVolume;
		}
		self.dispatchEvent(createEvent("volumeChange"));
	};

	// *******************************************************************************************
	//	Event Handlers
	// *******************************************************************************************

	// the stall-related functions have a timeout in order
	// to workaround browser issues that report stalls for VERY brief
	// moments (often 50-70ms).
	// don't let these escape the library unless there's an actual problem.

	var stall_timeout;
	var stall_active;
	var stopAudioConnectError = function() {
		if (stall_timeout) {
			clearTimeout(stall_timeout);
			stall_timeout = null;
		}
		stall_active = false;
	};
	var doAudioConnectError = function(detail) {
		if (stall_active) {
			dispatchStall(detail);
		}
		else if (stall_timeout) {
			return;
		}
		else {
			stall_timeout = setTimeout(function() {
				dispatchStall(detail);
			}, 1000);
		}
	};

	var dispatchStall = function(detail) {
		// console.log("Sending stall: " + (detail || "<audio>"));
		var evt = createEvent("stall");
		evt.detail = detail;
		self.dispatchEvent(evt);
		stall_timeout = null;
		stall_active = true;
	};

	var onPlay = function() {
		// console.log("Sending play.");
		stopAudioConnectError();
		self.dispatchEvent(createEvent("playing"));
		self.dispatchEvent(createEvent("change"));
	};

	var onWaiting = function() {
		// console.log("Sending loading.");
		stopAudioConnectError();
		self.dispatchEvent(createEvent("loading"));
	};

	var onStop = function() {
		// console.log("Sending stop.");
		stopAudioConnectError();
		self.dispatchEvent(createEvent("stop"));
		self.dispatchEvent(createEvent("change"));
	};

	var onStall = function(e, i) {
		// console.log("Stall detected.");
		// we need to handle stalls from sources (which have an index)
		// and stalls from the audio element themselves in this function
		// we handle sources so that we know how bad things are.
		// we give errors such as "3/5 sources have failed."

		if ((i === undefined) && chromeSpecialFlag) {
			// we can ignore <audio> element stalls when Chrome is being special
			// because it is forever stalled for some reason. :/
			// we know it's an <audio> problem when the 2nd argument 'i' is undefined :)
			return;
		}

		var detail;
		if (i !== undefined) {
			detail = " (" + (i + 1) + "/" + streamURLs.length + ")";
		}
		doAudioConnectError(detail);
	};

	var onError = function(e) {
		console.log("Sending error.");
		stopAudioConnectError();
		self.stop();
		self.dispatchEvent(createEvent("error"));
	};

	// *******************************************************************************************
	//  Event Emitting
	// *******************************************************************************************

	self.dispatchEvent = function(evt) {
		if (!callbacks[evt.type]) {
			return;
		}
		for (var i = 0; i < callbacks[evt.type].length; i++) {
			callbacks[evt.type][i](evt);
		}
	};

	self.addEventListener = function(evtname, callback) {
		if (!callbacks[evtname]) {
			console.error(evtname + " is not a isSupported event for the Rainwave Player.");
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
