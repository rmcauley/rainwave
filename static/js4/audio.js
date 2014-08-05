var R4Audio = function() {
	var self = {};
	self.supported = false;
	self.type = null;
	var filetype;
	var stream_urls = [];

	var icon_el;
	var text_el;

	var audio_el = document.createElement('audio');
	if ("canPlayType" in audio_el) {
		var can_vorbis = audio_el.canPlayType('audio/ogg; codecs="vorbis"');
		var can_mp3 = audio_el.canPlayType('audio/mpeg; codecs="mp3"');
		if ((can_vorbis == "maybe") || (can_vorbis == "probably")) {
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

	self.initialize = function(stream_filename, relays) {
		icon_el = $id("audio_icon");
		text_el = $id("audio_status");
		if (!self.supported) return;

		$id("player_link").addEventListener("click", self.play_stop);
		if (self.type == "Vorbis") stream_filename += ".ogg";
		else if (self.type == "MP3") stream_filename += ".mp3";
		if (User.listen_key) {
			stream_filename += "?" + User.id + ":" + User.listen_key;
		}
		for (var i in relays) {
			stream_urls.push(relays[i].protocol + relays[i].hostname + ":" + relays[i].port + "/" + stream_filename);
		}
	};

	self.draw = function() {
		text_el.textContent = $l("tunein");
	};

	self.clear_audio_errors = function(e) {
		ErrorHandler.remove_permanent_error("audio_error");
		ErrorHandler.remove_permanent_error("audio_connect_error");
	};

	self.play_stop = function(evt) {
		if (audio_el) self.stop(evt);
		else self.play(evt);
	};

	self.play = function(evt) {
		if (!self.supported) return;
		if (evt) evt.preventDefault();

		if (audio_el) return;

		audio_el = $id("measure_box").appendChild(document.createElement("audio"));
		audio_el.addEventListener('stop', self.on_stop);
		//audio_el.addEventListener('loadstart', self.on_connecting);
		audio_el.addEventListener('play', self.on_play);
		audio_el.addEventListener('stall', self.on_stall);
		var source;
		for (var i in stream_urls) {
			source = $el("source", { "src": stream_urls[i], "type": filetype });
			source.addEventListener('playing', self.clear_audio_errors);
			audio_el.appendChild(source);
		}

		audio_el.lastChild.addEventListener('error', self.on_error);

		audio_el.play();
	};

	self.stop = function(evt) {
		if (!self.supported) return;
		if (evt) evt.preventDefault();
		if (!audio_el) return;

		audio_el.pause();
		while (audio_el.firstChild) audio_el.removeChild(audio_el.firstChild);
		audio_el.parentNode.removeChild(audio_el);
		audio_el = null;
		self.on_stop();
	};

	self.on_stop = function() {
		icon_el.className = "";
		text_el.textContent = $l("tunein");
		self.stop();
	};

	self.on_connecting = function() {
		icon_el.className = "audio_connecting";
	};

	self.on_play = function() {
		icon_el.className = "audio_playing";
		text_el.textContent = $l("stop");
		self.clear_audio_errors();
	};

	self.on_stall = function() {
		icon_el.className = "audio_connecting";
		var a = $el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": $l("try_external_player") });
		a.addEventListener("click", function() {
			self.stop();
			self.clear_audio_errors();
		})
		ErrorHandler.permanent_error(ErrorHandler.make_error("audio_connect_error", 500), a);
	};

	self.on_error = function() {
		var a = $el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": $l("try_external_player") });
		a.addEventListener("click", function() {
			self.clear_audio_errors();
		})
		ErrorHandler.permanent_error(ErrorHandler.make_error("audio_error", 500), a);
		self.on_stop();
		self.supported = false;
	};

	return self;
}();