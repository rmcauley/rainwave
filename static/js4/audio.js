var R4Audio = function() {
	var self = {};
	self.supported = false;
	self.type = null;
	var filetype;
	var stream_urls = [];

	// todo: onabort, onstall

	var audio_el = document.createElement('audio');
	if ("canPlayType" in audio_el) {
		{
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
	}
	audio_el = null;

	self.initialize = function(stream_filename, relays) {
		if (!self.supported) return;
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

	};

	self.clear_audio_errors = function(e) {
		ErrorHandler.remove_permanent_error("audio_error");
	};

	self.play = function() {
		if (!self.supported) return;
		if (audio_el) return;

		audio_el = $id("measure_box").appendChild(document.createElement("audio"));
		var source;
		for (var i in stream_urls) {
			source = $el("source", { "src": stream_urls[i], "type": filetype });
			source.addEventListener('playing', clear_audio_errors);
			audio_el.appendChild(source);
		}

		audio_el.lastChild.addEventListener('error', function(ev) {
			ErrorHandler.permanent_error(ErrorHandler.make_error("audio_error", 500));
			self.stop();
		});

		audio_el.play();
	};

	self.stop = function() {
		if (!self.supported) return;
		if (!audio_el) return;

		audio_el.pause();
		while (audio_el.firstChild) audio.el.removeChild(audio_el.firstChild);
		audio_el.parentNode.removeChild(audio_el);
		audio_el = null;
	};

	// self.volume...?

	return self;
}();