var RWAudio = function() {
	"use strict";

	var self = {};
	self.supported = false;
	self.type = null;
	self.changed_status_callback = null;
	self.playing_status = false;
	var filetype;
	var stream_urls = [];
	var playing_status = false;

	var el;
	var volume_el;
	var volume_rect;
	var mute_el;
	var muted;
	var offset_width;
	var last_user_tunein_check = 0;
	var audio_el_dest;

	// Chrome on mobile has a really nasty habit of stalling AFTER playback has started
	// And also taking AGES to start the actual playback.
	// We use this flag in a few places to stop Chrome from murdering itself on mobile
	var chrome_is_a_snowflake = false;

	var audio_el = document.createElement("audio");
	if ("canPlayType" in audio_el) {
		// circumvent Ogg here since it'll be far more battery draining than MP3 for mobile devices
		var can_vorbis = false;
		if (MOBILE) {
			// stays false
		}
		else if (navigator.userAgent.indexOf("CrKey") !== -1) {
			// stays false
		}
		else {
			can_vorbis = audio_el.canPlayType("audio/ogg; codecs=\"vorbis\"");
		}

		var can_mp3 = audio_el.canPlayType("audio/mpeg; codecs=\"mp3\"");
		// we have to check for Mozilla support specifically
		// because Webkit will choke on Vorbis and stop playing after
		// a single song switch, and thus, we have to forcefeed it MP3.
		if ((navigator.mozIsLocallyAvailable || navigator.mozApps || navigator.mozContacts) && ((can_vorbis == "maybe") || (can_vorbis == "probably"))) {
			filetype = "audio/ogg";
			self.type = "Vorbis";
			self.supported = true;
		}
		else if ((can_mp3 == "maybe") || (can_mp3 == "probably")) {
			filetype = "audio/mpeg";
			self.type = "MP3";
			self.supported = true;
		}

		if ((navigator.userAgent.indexOf("Chrome") > -1) && (navigator.userAgent.indexOf("Android") > -1)) {
			chrome_is_a_snowflake = true;
		}
	}
	audio_el = null;

	var setup_audio = function() {
		if (audio_el && audio_el.parentNode) {
			audio_el.parentNode.removeChild(audio_el.parentNode);
		}
		audio_el = document.createElement("audio");
		// this should be set but it breaks Safari
		// I guess it doesn't matter much since we're playing anyway
		// and this doesn't appear on page load, though. >_>
		// audio_el.setAttribute("preload", "none");
		audio_el.addEventListener("stop", self.stop);
		// do not use "play" - it must be "playing"!!
		audio_el.addEventListener("playing", self.on_play);
		// has severe issues on Chrome for mobile
		audio_el.addEventListener("stalled", self.on_stall);
		// fires when audio element starts to download
		audio_el.addEventListener("waiting", self.on_connecting);
		// non-functional with icecast
		// audio_el.addEventListener("loadeddata", self.on_audio_loaddeddata);
		// always reports true, same time as 'connecting'
		// audio_el.addEventListener("loadstart", self.on_audio_loadstart);

		audio_el_dest.appendChild(audio_el);
	};

	BOOTSTRAP.on_init.push(function(root_template) {
		if (!self.supported) return;

		audio_el_dest = root_template.measure_box;

		root_template.volume = document.getElementById("audio_volume");
		root_template.volume_indicator = document.getElementById("audio_volume_indicator");
		root_template.volume.style.display = null;
		root_template.mute.parentNode.appendChild(root_template.volume);

		root_template.volume.addEventListener("mousedown", volume_control_mousedown);
		root_template.mute.addEventListener("click", self.toggle_mute);
		root_template.play.addEventListener("click", self.play_stop);
		root_template.play2.addEventListener("click", self.play);
		root_template.stop.addEventListener("click", self.stop);

		el = root_template.player;
		volume_el = root_template.volume;
		volume_rect = root_template.volume_indicator;
		mute_el = root_template.mute;

		var stream_filename = BOOTSTRAP.stream_filename;
		if (self.type == "Vorbis") stream_filename += ".ogg";
		else if (self.type == "MP3") stream_filename += ".mp3";
		if (User && User.listen_key) {
			stream_filename += "?" + User.id + ":" + User.listen_key;
		}
		for (var i in BOOTSTRAP.relays) {
			stream_urls.push(BOOTSTRAP.relays[i].protocol + BOOTSTRAP.relays[i].hostname + ":" + BOOTSTRAP.relays[i].port + "/" + stream_filename);
		}
		// randomize the relay order, except for the round robin
		var robin = stream_urls.splice(0, 1);
		shuffle(stream_urls);
		stream_urls.unshift(robin[0]);

		API.add_callback("user", user_tunein_check);

		setup_audio();

		Prefs.define("vol", [ 1.0 ]);
		draw_volume(Prefs.get("vol"));
	});

	var user_tunein_check = function(json) {
		if (json.tuned_in) {
			document.body.classList.add("tuned_in");
		}
		else {
			document.body.classList.remove("tuned_in");
		}
		if (!playing_status) return;
		if (last_user_tunein_check < (Clock.now - 300)) {
			last_user_tunein_check = parseInt(Clock.now);
			if (!json.tuned_in) {
				ErrorHandler.remove_permanent_error("audio_connect_error_reattempting");
				ErrorHandler.remove_permanent_error("chrome_mobile_takes_time");
				self.stop();
				self.play();
			}
		}

		if (json.tuned_in) {
			self.clear_audio_errors();
		}
	};

	self.clear_audio_errors = function(e) {
		if (!ErrorHandler) return;
		ErrorHandler.remove_permanent_error("m3u_hijack_right_click");
		ErrorHandler.remove_permanent_error("audio_error");
		remove_audio_connect_error();
		ErrorHandler.remove_permanent_error("chrome_mobile_takes_time");
		el.classList.remove("working");
	};

	self.play_stop = function(evt) {
		if (playing_status) self.stop(evt);
		else self.play(evt);
	};

	var setup_source = function(i, stream_url) {
		var source = document.createElement("source");
		source.setAttribute("src", stream_url);
		source.setAttribute("type", filetype);
		// doesn't work
		// source.addEventListener("playing", self.on_play);
		if (i == stream_urls.length - 1) {
			source.addEventListener("error", self.on_error);
		}
		else {
			source.addEventListener("error", function(e) {
				self.on_stall(e, i);
			});
		}
		return source;
	};

	self.play = function(evt) {
		// if (evt) {
		// 	evt.preventDefault();
		// }

		if (!self.supported) {
			if (!self.detect_hijack() || !ErrorHandler) return;
			ErrorHandler.nonpermanent_error(ErrorHandler.make_error("m3u_hijack_right_click", 500));
			return;
		}

		if (!playing_status) {
			if (ErrorHandler && chrome_is_a_snowflake) {
				ErrorHandler.permanent_error(ErrorHandler.make_error("chrome_mobile_takes_time", 500));
			}

			if (!Prefs.get("vol") || (Prefs.get("vol") > 1) || (Prefs.get("vol") < 0)) {
				Prefs.change("vol", 1.0);
			}
			audio_el.volume = Prefs.get("vol");
			draw_volume(Prefs.get("vol"));

			for (var i = 0; i < stream_urls.length; i++) {
				audio_el.appendChild(setup_source(i, stream_urls[i]));
			}
		}

		if (!playing_status) {
			audio_el.play();
			playing_status = true;
			self.playing_status = true;
			if (self.changed_status_callback) self.changed_status_callback(playing_status);
		}
	};

	self.stop = function(evt, no_error_clear) {
		if (!self.supported) return;
		// if (evt) evt.preventDefault();

		el.classList.remove("playing");
		el.classList.remove("working");
		playing_status = false;
		self.playing_status = false;

		if (!no_error_clear) {
			self.clear_audio_errors();
		}

		while (audio_el.firstChild) audio_el.removeChild(audio_el.firstChild);
		if (audio_el.parentNode) audio_el.parentNode.removeChild(audio_el);
		audio_el.pause(0);
		audio_el.removeAttribute("src");
		try {
			audio_el.load();
		}
		catch (e) {
			// we WANT it to fail
		}
		audio_el = null;
		setup_audio();
		if (self.changed_status_callback) {
			self.changed_status_callback(playing_status);
		}
	};

	self.toggle_mute = function() {
		if (muted) {
			el.classList.remove("muted");
			muted = false;
			if (audio_el) {
				audio_el.volume = Prefs.get("vol") || 0.5;
			}
			draw_volume(Prefs.get("vol") || 0.5);
		}
		else {
			el.classList.add("muted");
			muted = true;
			if (audio_el) {
				audio_el.volume = 0;
			}
			draw_volume(0);
		}
	};

	self.on_connecting = function() {
		//console.log("waiting");
		el.classList.add("working");
	};

	self.on_play = function() {
		//console.log("playing");
		el.classList.add("playing");
		el.classList.remove("working");
		self.clear_audio_errors();
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	var stall_timeout;
	var remove_audio_connect_error = function() {
		ErrorHandler.remove_permanent_error("audio_connect_error");
		if (stall_timeout) {
			clearTimeout(stall_timeout);
		}
	};
	var show_audio_connect_error = function(append) {
		if (stall_timeout) return;
		stall_timeout = setTimeout(function() {
			ErrorHandler.permanent_error(ErrorHandler.make_error("audio_connect_error", 500), append);
			stall_timeout = null;
		}, 1500);
	};

	self.on_stall = function(e, i) {
		if (i !== undefined) {
			//console.log("stalled after source error");
		}
		else if (chrome_is_a_snowflake) {
			return;
		}
		else {
			//console.log("stalled from audio element");
		}
		el.classList.remove("playing");
		el.classList.add("working");
		if (!ErrorHandler) return;
		var append;
		if (i !== undefined) {
			append = document.createElement("span");
			append.textContent = " (" + (i + 1) + "/" + stream_urls.length + ")";
		}
		show_audio_connect_error(append);
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	self.on_error = function(e) {
		//console.log("error");
		if (!ErrorHandler) return;
		var a = document.createElement("a");
		a.setAttribute("href", "/tune_in/" + User.sid + ".mp3");
		a.className = "link obvious";
		a.textContent = $l("try_external_player");
		a.addEventListener("click", function() {
			self.clear_audio_errors();
		});
		remove_audio_connect_error();
		ErrorHandler.remove_permanent_error("chrome_mobile_takes_time");
		ErrorHandler.nonpermanent_error(ErrorHandler.make_error("audio_error", 500), a);
		self.stop(null, true);
		self.supported = false;
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	var volume_control_mousedown = function(evt) {
		if (evt.button !== 0) return;
		offset_width = parseInt(window.getComputedStyle(volume_el, null).getPropertyValue("width"));
		change_volume_from_mouse(evt);
		volume_el.addEventListener("mousemove", change_volume_from_mouse);
		document.addEventListener("mouseup", volume_control_mouseup);
	};

	var volume_control_mouseup = function(evt) {
		volume_el.removeEventListener("mousemove", change_volume_from_mouse);
		document.removeEventListener("mouseup", volume_control_mouseup);
	};

	var change_volume_from_mouse = function(evt) {
		var x = evt.layerX !== undefined ? evt.layerX : evt.offsetX;
		var v = Math.min(Math.max((x / offset_width), 0), 1);
		if (v < 0.05) v = 0;
		if (v > 0.95) v = 1;
		if (!v || isNaN(v)) v = 0;
		if (audio_el) {
			audio_el.volume = v;
		}
		draw_volume(v);
		if (v === 0) {
			if (!el.classList.contains("muted")) {
				el.classList.add("muted");
			}
			muted = true;
		}
		else if (el.classList.contains("muted")) {
			el.classList.remove("muted");
			muted = false;
		}
		else {
			muted = false;
		}
		if (Prefs) Prefs.change("vol", v);
	};

	var draw_volume = function(v) {
		volume_rect.setAttribute("width", 100 * v);
	};

	self.detect_hijack = function() {
		if (navigator.plugins && (navigator.plugins.length > 0)) {
			for (var i = 0; i < navigator.plugins.length; i++ ) {
				if (navigator.plugins[i]) {
					for (var j = 0; j < navigator.plugins[i].length; j++) {
						if (navigator.plugins[i][j].type) {
							if (navigator.plugins[i][j].type == "audio/x-mpegurl") return navigator.plugins[i][j].enabledPlugin.name;
						}
					}
				}
			}
		}
		return false;
	};

	return self;
}();
