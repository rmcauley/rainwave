'use strict';

var Event = function() {
	var e_self = {};

	e_self.load = function(json) {
		if (json.type == "election") {
			// nothing special for elections right now
			return EventBase(json);
		}
		else if (json.type == "OneUp") {
			return OneUp(json);
		}
		throw("Unknown event type '" + json.type + "'");
	}
	return e_self;
}();

var EventBase = function(json) {
	var self = {};
	self.data = json;
	self.id = json.id;
	self.type = json.type;
	self.length = json.length;
	self.end = json.end;
	self.pending_delete = false;
	self.name = null;
	self.height = null;
	self.el = null;
	self.elements = {};
	self.songs = null;

	if (json.songs) {
		self.songs = [];
		if ("songs" in json) {
			for (var i = 0; i < json.songs.length; i++) {
				self.songs.push(TimelineSong(json.songs[i]));
			}
		}
	}

	var draw = function() {
		self.el = $el("div", { "class": "timeline_event timeline_" + self.type });
		if (self.songs) {
			// shuffle our songs to draw in the array
			if (self.type.indexOf("election") != -1) {
				shuffle(self.songs);
			}
			for (var i = 0; ((i < self.songs.length) && (i < 5)) ; i++) {
				self.el.appendChild(self.songs[i].el);

			}
		}
		self.height = $measure_el(self.el).height;
		self.el.style.height = "0px";
	}

	self.update = function(json) {
		self.data.end = json.end;
		self.data.start = json.start;
		self.data.predicted_start = json.predicted_start;

		if (self.songs) {
			for (var i = 0; i < self.songs.length; i++) {
				for (var j = 0; j < json.songs.length; j++) {
					if (songs[i].id == json.songs[j].id) {
						songs[i].update(json.songs[j].id);
					}
				}
			}
		}
	}

	self.change_to_now_playing = function(new_song_array) {
		if (!self.songs || !new_song_array || (self.songs.length == 1)) return;
		self.songs.sort(function(a, b) { return a.data.entry_position - b.data.entry_position; });
		for (var i = 0; i < self.songs.length; i++) {
			self.el.appendChild(self.songs[i].el);
		}
	};

	self.change_to_history = function() {
		if (!self.songs) return;
		if (self.songs.length == 1) return;
		self.height = $measure_el(self.songs[0].el).height;
		self.el.style.height = self.height + "px";
	};

	self.enable_voting = function() {
		if (!self.songs) {
			return;
		}
		for (var i = 0; i < self.songs; i++) {
			self.songs[i].enable_voting();
		}
	};

	self.clear_voting_status = function() {
		if (!self.songs) {
			return;
		}
		for (var i = 0; i < self.songs; i++) {
			self.songs[i].clear_voting_status();
		}	
	}

	self.disable_voting = function() {
		if (!self.songs) {
			return;
		}
		for (var i = 0; i < self.songs; i++) {
			self.songs[i].disable_voting();
		}
	};

	self.register_vote = function(song_id) {
		if (!self.songs) return;
		for (var i = 0; i < self.songs; i++) {
			if (song_id == self.songs[i].id) {
				self.songs[i].register_vote();
			}
			else {
				self.songs[i].unregister_vote();
			}
		}
	};

	draw();
	return self;
};
