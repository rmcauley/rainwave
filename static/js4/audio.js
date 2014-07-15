var R4Audio = function() {
	var self = {};
	var audio_el;
	var supported = false;

	self.draw = function(stream_filename, relays) {
		audio_el = $id("audio");
		if (!("canPlayType" in audio_el)) {
			return;
		}
		var filetype;
		if (audio_el.canPlayType('audio/ogg; codecs="vorbis"') == "probably") {
			stream_filename += ".ogg";
			filetype = "audio/ogg";
		}
		else if (audio_el.canPlayType('audio/mpeg; codecs="mp3"') == "probably") {
			stream_filename += ".mp3";
			filetype = "audio/mpeg";
		}
		else {
			return;
		}
		supported = true;
		if (User.listen_key) {
			stream_filename += "?" + User.id + ":" + User.listen_key;
		}
		for (var i in relays) {
			audio_el.appendChild($el("source", { "src": relays[i].protocol + relays[i].hostname + ":" + relays[i].port + "/" + stream_filename, "type": filetype }));
		}
		audio_el.lastChild.addEventListener('error', function(ev) {
			ErrorHandler.permanent_error(ErrorHandler.make_error("audio_error", 500));
		});
	};

	self.play = function() {
		audio_el.play();
	};

	self.stop = function() {
		audio_el.stop();
	};


	// self.volume...?

	return self;
}();