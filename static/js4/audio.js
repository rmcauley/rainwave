/* Usage Instructions

	Download and include this Javascript file to your page.  No jQuery required, and
	no conflicts will happen with existing code.

	Create a simple HTML block on your page:

	<div id='r4_audio_player'>
		<div id='audio_icon'></div>
	</div>

	Style the page as you see fit.
		- No class present on audio_icon means the player is stopped
		- Class "playing" will be applied to r4_audio_player when playing

	Next pick your station ID:
		1 = Game
		2 = OC Remix
		3 = Covers
		4 = Chiptunes
		5 = All

	Put the following in your page startup, replacing 1 with the station ID you picked:
		R4Audio.initialize(R4AudioMounts[1], R4AudioRelays[1])

	When the user clicks your r4_audio_player div, the music will start playing.
*/

var R4Audio = function() {
	"use strict";

	var self = {};
	self.supported = false;
	self.type = null;
	self.changed_status_callback = null;
	var filetype;
	var stream_urls = [];
	var playing_status = false;

	var icon_el;
	//var text_el;
	var volume_el;
	var volume_rect;
	var offset_width;
	var last_user_tunein_check = 0;

	var audio_el = document.createElement("audio");
	if ("canPlayType" in audio_el) {
		// circumvent Ogg here since it'll be far more battery draining than MP3 for mobile devices
		var can_vorbis = MOBILE ? false : audio_el.canPlayType("audio/ogg; codecs=\"vorbis\"");
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
	}
	audio_el = null;

	self.get_playing_status = function() {
		return playing_status;
	};

	self.initialize = function(stream_filename, relays) {
		icon_el = document.getElementById("audio_icon");
		//text_el = document.getElementById("audio_status");
		if (!self.supported) return;

		var container = document.getElementById("player_link") || document.getElementById("r4_audio_player");
		container.addEventListener("click", self.play_stop);
		if (self.type == "Vorbis") stream_filename += ".ogg";
		else if (self.type == "MP3") stream_filename += ".mp3";
		if (User && User.listen_key) {
			stream_filename += "?" + User.id + ":" + User.listen_key;
		}
		for (var i in relays) {
			stream_urls.push(relays[i].protocol + relays[i].hostname + ":" + relays[i].port + "/" + stream_filename);
		}

		volume_el = document.getElementById("audio_volume");
		if (volume_el) {
			volume_rect = document.getElementById("audio_volume_indicator");
			volume_el.addEventListener("mousedown", volume_control_mousedown);
		}

		var mute_el = document.getElementById("audio_icon_mute");
		if (mute_el) {
			mute_el.addEventListener("click", self.toggle_mute);
		}

		API.add_callback(user_tunein_check, "user");

		Prefs.define("audio_volume", [ 1.0 ]);
	};

	var user_tunein_check = function(json) {
		if (!playing_status) return;
		if (last_user_tunein_check < (Clock.now - 300)) {
			last_user_tunein_check = parseInt(Clock.now);
			if (!json.tuned_in) {
				ErrorHandler.remove_permanent_error("audio_connect_error_reattempting");
				self.stop();
				self.play();
			}
		}

		if (json.tuned_in) {
			ErrorHandler.remove_permanent_error("m3u_hijack_right_click");
		}
	};

	self.draw = function() {
		if ($l) {
			$id("audio_status_stop").textContent = $l("stop");
			$id("audio_status_play").textContent = $l("tunein");
		}
	};

	self.clear_audio_errors = function(e) {
		if (!ErrorHandler) return;
		ErrorHandler.remove_permanent_error("audio_error");
		ErrorHandler.remove_permanent_error("audio_connect_error");
		Prefs.change("show_m3u", true);
	};

	self.play_stop = function(evt) {
		if (audio_el) self.stop(evt);
		else self.play(evt);
	};

	self.play = function(evt) {
		if (!self.supported) {
			if (!self.detect_hijack() || !ErrorHandler) return;
			if (evt) evt.preventDefault();
			ErrorHandler.permanent_error(ErrorHandler.make_error(400, "m3u_hijack_right_click"));
			return;
		}
		if (evt) evt.preventDefault();

		if (audio_el) return;

		audio_el = document.createElement("audio");
		audio_el.addEventListener("stop", self.on_stop);
		//audio_el.addEventListener("loadstart", self.on_connecting);
		audio_el.addEventListener("play", self.on_play);
		audio_el.addEventListener("stall", self.on_stall);
		// this doesn't appear to work correctly in Firefox
		// if (volume_el) {
		// 	audio_el.addEventListener("volumechange", draw_volume);
		// }
		var mute_el = document.getElementById("audio_icon_mute");
		if (mute_el) mute_el.setAttribute("class", null);
		if ((Prefs.get("audio_volume") > 1) || (Prefs.get("audio_volume") < 0) || !Prefs.get("audio_volume")) {
			Prefs.change("audio_volume", 1.0);
		}
		audio_el.volume = Prefs.get("audio_volume");
		draw_volume(Prefs.get("audio_volume"));
		var source;
		for (var i in stream_urls) {
			source = document.createElement("source");
			source.setAttribute("src", stream_urls[i]);
			source.setAttribute("type", filetype);
			source.addEventListener("playing", self.clear_audio_errors);
			audio_el.appendChild(source);
		}

		audio_el.lastChild.addEventListener("error", self.on_error);

		audio_el.play();
		playing_status = true;
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	self.stop = function(evt) {
		if (!self.supported) return;
		if (evt) evt.preventDefault();
		if (!audio_el) return;

		audio_el.pause(0);
		while (audio_el.firstChild) audio_el.removeChild(audio_el.firstChild);
		audio_el.src = "";
		audio_el.load();
		audio_el = null;
		self.on_stop();
		playing_status = false;
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	self.toggle_mute = function() {
		if (!audio_el) return;
		var mute_el = document.getElementById("audio_icon_mute");
		if (audio_el.volume === 0) {
			mute_el.setAttribute("class", null);
			audio_el.volume = Prefs.get("audio_volume");
		}
		else {
			audio_el.volume = 0;
			mute_el.setAttribute("class", "muted");
		}
	};

	self.on_stop = function() {
		document.getElementById("r4_audio_player").className = "";
		//text_el.textContent = $l ? $l("tunein") : "Tune In";
		self.stop();
	};

	self.on_connecting = function() {
		// nothin
	};

	self.on_play = function() {
		document.getElementById("r4_audio_player").className = "playing";
		//text_el.textContent = $l ? $l("stop") : "Stop";
		self.clear_audio_errors();
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	self.on_stall = function() {
		if (!ErrorHandler) return;
		var a = $el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": $l("try_external_player") });
		a.addEventListener("click", function() {
			self.stop();
			self.clear_audio_errors();
		});
		ErrorHandler.permanent_error(ErrorHandler.make_error("audio_connect_error", 500), a);
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	self.on_error = function() {
		if (!ErrorHandler) return;
		var a = $el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": $l("try_external_player") });
		a.addEventListener("click", function() {
			self.clear_audio_errors();
		});
		ErrorHandler.permanent_error(ErrorHandler.make_error("audio_error", 500), a);
		self.on_stop();
		self.supported = false;
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	var volume_control_mousedown = function(evt) {
		if (!audio_el) return;
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
		var x = evt.offsetX === undefined ? evt.layerX : evt.offsetX;
		var v = Math.min(Math.max((x / offset_width), 0), 1);
		if (v < 0.05) v = 0;
		if (v > 0.95) v = 1;
		if (!v || isNaN(v)) v = 0;
		audio_el.volume = v;
		draw_volume(v);
		document.getElementById("audio_icon_mute").setAttribute("class", null);
		if (Prefs) Prefs.change("audio_volume", v);
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