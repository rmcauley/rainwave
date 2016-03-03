var RWAudio = function() {
	"use strict";

	// this file uses RainwavePlayer which confirms to Javascript standards
	// unlike the rest of my codebase
	// furthermore it was all hacked in
	// so expect the worst in variable naming mixing

	var self = RainwavePlayer;
	if (!self.isSupported) return;

	var el;
	var volume_el;
	var volume_rect;
	var mute_el;
	var muted;
	var offset_width;
	var last_user_tunein_check = 0;

	BOOTSTRAP.on_init.push(function(root_template) {
		self.audioElDest = root_template.measure_box;

		root_template.volume = document.getElementById("audio_volume");
		root_template.volume_indicator = document.getElementById("audio_volume_indicator");
		root_template.volume.style.display = "";
		root_template.mute.parentNode.appendChild(root_template.volume);

		root_template.volume.addEventListener("mousedown", volume_control_mousedown);
		root_template.mute.addEventListener("click", self.toggleMute);
		root_template.play.addEventListener("click", self.playToggle);
		root_template.play2.addEventListener("click", self.play);
		root_template.stop.addEventListener("click", self.stop);

		el = root_template.player;
		volume_el = root_template.volume;
		volume_rect = root_template.volume_indicator;
		mute_el = root_template.mute;

		var stream_filename = BOOTSTRAP.stream_filename + "." + self.type;
		var stream_urls = [];
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
		self.useStreamURLs(stream_urls);

		API.add_callback("user", user_tunein_check);

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
		if (!self.isPlaying) return;
		if (last_user_tunein_check < (Clock.now - 300)) {
			last_user_tunein_check = parseInt(Clock.now);
			if (!json.tuned_in) {
				ErrorHandler.remove_permanent_error("audio_connect_error_reattempting");
				ErrorHandler.remove_permanent_error("chrome_mobile_takes_time");
				self.stop();
				setTimeout(300, self.play);
			}
		}

		if (json.tuned_in) {
			clear_audio_errors();
		}
	};

	var clear_audio_errors = function(e) {
		ErrorHandler.remove_permanent_error("m3u_hijack_right_click");
		ErrorHandler.remove_permanent_error("audio_error");
		ErrorHandler.remove_permanent_error("chrome_mobile_takes_time");
		ErrorHandler.remove_permanent_error("audio_connect_error");
		el.classList.remove("working");
	};

	self.addEventListener("longLoadWarning", function() {
		ErrorHandler.permanent_error(ErrorHandler.make_error("chrome_mobile_takes_time", 500));
	});

	if (!Prefs.get("vol") || (Prefs.get("vol") > 1) || (Prefs.get("vol") < 0)) {
		self.setVolume(Prefs.get("vol"));
	}
	self.addEventListener("volumeChange", function() {
		if (self.isMuted) {
			el.classList.add("muted");
		}
		else {
			el.classList.remove("muted");
		}
		Prefs.change("vol", self.volume);
		draw_volume(self.volume);
	});

	self.addEventListener("stop", function() {
		el.classList.remove("playing");
		el.classList.remove("working");
	});

	self.addEventListener("loading", function() {
		el.classList.add("working");
	});

	self.addEventListener("playing", function() {
		el.classList.add("playing");
		el.classList.remove("working");
		clear_audio_errors();
	});

	self.addEventListener("stall", function(evt) {
		el.classList.remove("playing");
		el.classList.add("working");
		// var append;
		// if (evt.detail) {
		// 	append = document.createElement("span");
		// 	append.textContent = evt.detail;
		// }
		ErrorHandler.permanent_error(ErrorHandler.make_error("audio_connect_error", 500)); // , append);
	});

	self.addEventListener("error", function() {
		clear_audio_errors();
		var a = document.createElement("a");
		a.setAttribute("href", "/tune_in/" + User.sid + ".mp3");
		a.className = "link obvious";
		a.textContent = $l("try_external_player");
		a.addEventListener("click", function() {
			clear_audio_errors();
		});
		ErrorHandler.nonpermanent_error(ErrorHandler.make_error("audio_error", 500), a);
		self.stop();
	});

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
		self.setVolume(v);
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
};
