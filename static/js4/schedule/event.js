'use strict';

var Event = function() {
	var e_self = {};

	e_self.load = function(json) {
		if (json.type == "Election") {
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

var EventBase = function(json) {
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
			if (!self.data.used && (self.type.indexOf("election") != -1)) {
				shuffle(self.songs);
			}
			var max_index = self.data.used ? 1 : Math.min(self.songs.length, 5);
			for (var i = 0; i < max_index; i++) {
				self.el.appendChild(self.songs[i].el);
			}
			if (self.data.used) {
				changed_to_history = true;
			}
		}
		self.height = $measure_el(self.el).height;
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

	self.change_to_coming_up = function() {
		$add_class(self.el, "timeline_next");
	}

	self.change_to_now_playing = function() {
		$remove_class(self.el, "timeline_next");
		$add_class(self.el, "timeline_now_playing");
		self.name = self.songs[0].data.albums[0].name + " - " + self.songs[0].data.title;
		if (!self.songs || (self.songs.length == 1)) return;

		self.songs.sort(function(a, b) { return a.data.entry_position - b.data.entry_position; });
		for (var i = 0; i < self.songs.length; i++) {
			self.el.appendChild(self.songs[i].el);
		}
		self.height = $measure_el(self.el).height;
	};

	self.change_to_history = function() {
		if (changed_to_history) return;
		if (self.songs) {
			for (var i = 1; i < self.songs.length; i++) {
				Fx.remove_element(self.songs[i].el);
			}
			self.height = $measure_el(self.songs[0].el).height;
		}
		changed_to_history = true;
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

	self.move_to_y = function(new_y) {
		Fx.delay_css_setting(self.el, "transform", "translateY(" + new_y + "px)");
	};

	draw();
	if (self.data.voting_allowed) {
		self.enable_voting();
	}
	return self;
};
