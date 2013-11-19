'use strict';

var Event = function() {
	var e_self = {};

	e_self.load = function(json) {
		if (json.type == "election") {
			// nothing special for elections right now
			return EventBase(json, $l("Election"));
		}
		else if (json.type == "OneUp") {
			return OneUp(json, $l("OneUp"));;
		}
		throw("Unknown event type '" + json.type + "'");
	}
	return e_self;
}();

var EventBase = function(json, header_text) {
	var self = {};
	self.data = json;
	self.id = json.id;
	self.type = json.type;
	self.length = json.length;
	self.end = json.end;
	self.pending_delete = false;
	self.name = json.name || null;
	self.height = null;
	self.el = null;
	self.elements = {};
	self.songs = null;

	var changed_to_history = false;
	var header_height;
	var song_height;

	if (json.songs) {
		self.songs = [];
		if ("songs" in json) {
			for (var i = 0; i < json.songs.length; i++) {
				self.songs.push(TimelineSong(json.songs[i]));
			}
		}
	}

	var set_class = function(new_class) {
		if (!new_class) new_class = "";
		self.el.setAttribute("class", "timeline_event timeline_" + self.type + " " + new_class);
	}

	var draw = function() {
		self.el = $el("div");
		set_class();
		self.elements.header = $el("div", { "class": "timeline_header", "textContent": header_text });
		header_height = $measure_el(self.elements.header).height;
		self.el.appendChild(self.elements.header);

		if (self.songs) {
			song_height = $measure_el(self.songs[0].el).height;
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
		self.data = json;
		self.end = json.end;
		self.start = json.start;
		self.predicted_start = json.predicted_start;
		self.start_actual = json.start_actual
		if (self.data.voting_allowed) {
			self.enable_voting();
		}
		else {
			self.disable_voting();
		}

		if (self.songs) {
			for (var i = 0; i < self.songs.length; i++) {
				for (var j = 0; j < json.songs.length; j++) {
					if (self.songs[i].id == json.songs[j].id) {
						self.songs[i].update(json.songs[j].id);
					}
				}
			}
		}
	}

	self.change_to_now_playing = function() {
		set_class("timeline_now_playing");
		self.elements.header.textContent = $l("Now_Playing");
		self.name = self.songs[0].data.albums[0].name + " - " + self.songs[0].data.title;
		if (!self.songs || (self.songs.length == 1)) return;

		self.songs.sort(function(a, b) { return a.data.entry_position - b.data.entry_position; });
		for (var i = 0; i < self.songs.length; i++) {
			self.el.appendChild(self.songs[i].el);
		}
	};

	self.change_to_history = function(keep_header) {
		if (changed_to_history) return;
		if (keep_header) {
			if (self.songs) {
				self.height = song_height + header_height;
			}
			self.elements.header.textContent = $l("History");
			set_class("timeline_first_history");
		}
		else {
			if (!self.songs) {
				self.height -= header_height;
			}
			else {
				self.height = song_height;
			}
			set_class("timeline_history");
			changed_to_history = true;
		}
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
	if (self.data.voting_allowed) {
		self.enable_voting();
	}
	return self;
};
