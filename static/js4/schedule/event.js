var Event = function() {
	"use strict";
	var e_self = {};

	e_self.load = function(json) {
		if (json.type == "Election") {
			// nothing special for elections right now
			return EventBase(json, $l("Election"));
		}
		else if ((json.type == "OneUp") || (json.type == 'SingleSong')) {
			return OneUp(json, $l("OneUp"));
		}
		throw("Unknown event type '" + json.type + "'");
	};

	return e_self;
}();

var EventBase = function(json) {
	"use strict";
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

	var header = $el("div", { "class": "timeline_header" });
	self.elements.header_clock = $el("span", { "class": "timeline_header_clock" });
	var header_vote_result = $el("div", { "class": "timeline_header_vote_result" });
	var header_text = $el("a");
	var current_header_default_text;
	var now_playing = false;
	var header_bar = $el("div", { "class": "timeline_header_bar" });
	var header_inside_bar = $el("div", { "class": "timeline_header_bar_inside" });
	header_bar.appendChild(header_inside_bar);
	header.appendChild(self.elements.header_clock);
	header.appendChild(header_text);
	self.header_text;

	if (json.songs) {
		self.songs = [];
		if ("songs" in json) {
			for (var i = 0; i < json.songs.length; i++) {
				self.songs.push(TimelineSong.new(json.songs[i]));
			}
		}
	}

	var draw = function() {
		self.el = $el("div", { "class": "timeline_event timeline_" + self.type });
		self.el.appendChild(header);
		if (self.songs) {
			// shuffle our songs to draw in the array if it's not used yet
			if (!self.data.used && (self.type.toLowerCase().indexOf("election") != -1)) {
				shuffle(self.songs);
			}
			for (var i = 0; i < self.songs.length; i++) {
				self.el.appendChild(self.songs[i].el);
			}
		}
		self.el.appendChild(header_bar);
	};

	self.update = function(json) {
		self.data = json;
		self.end = json.end;
		self.start = json.start;
		self.predicted_start = json.predicted_start;
		self.start_actual = json.start_actual;
		if (self.data.voting_allowed) {
			self.enable_voting();
		}
		else {
			self.disable_voting();
		}

		if (self.songs) {
			for (var i = 0; i < self.songs.length; i++) {
				for (var j = 0; j < json.songs.length; j++) {
					if (self.songs[i].data.id == json.songs[j].id) {
						self.songs[i].update(json.songs[j]);
					}
				}
			}
		}
	};

	self.change_to_coming_up = function() {
		$add_class(self.el, "timeline_next");
		current_header_default_text = $l("coming_up");
		now_playing = false;
		self.set_header_text();
	};

	self.change_to_now_playing = function() {
		if ($has_class(self.el, "timeline_now_playing")) return;
		now_playing = true;
		current_header_default_text = $l("now_playing");
		$remove_class(self.el, "timeline_next");
		self.set_header_text();
		Clock.pageclock = self.elements.header_clock;
		if (self.songs && (self.songs.length > 1)) {
			// other places in the code rely on songs[0] to be the winning song
			// make sure we sort properly for that condition here
			header_vote_result.appendChild($el("span", { "textContent": $l("voting_results_were") + " " }));
			for (var i = 0; i < self.songs.length; i++) {
				header_vote_result.appendChild($el("span", { "textContent": self.songs[i].data.entry_votes }));
				if ($has_class(self.songs[i].el, "voting_registered")) {
					header_vote_result.lastChild.className = "self_voted_result";
				}
				if (i != (self.songs.length - 1)) {
					header_vote_result.appendChild($el("span", { "textContent": " - " }));
				}
			}
			self.songs.sort(function(a, b) { return a.data.entry_position < b.data.entry_position ? -1 : 1; });
			if (self.songs[0].data.entry_votes) {
				self.el.insertBefore(header_vote_result, header_bar);				
			}
			$add_class(self.songs[0].el, "timeline_now_playing_song");
		}
		else if (self.songs && (self.songs.length > 0)) {
			$add_class(self.songs[0].el, "timeline_now_playing_song");
		}
		$add_class(self.el, "timeline_now_playing");
	};

	self.enable_voting = function() {
		if (!self.songs) {
			return;
		}
		for (var i = 0; i < self.songs.length; i++) {
			self.songs[i].enable_voting();
		}
		self.set_header_text();
	};

	self.clear_voting_status = function() {
		if (!self.songs) {
			return;
		}
		for (var i = 0; i < self.songs.length; i++) {
			self.songs[i].clear_voting_status();
		}	
	};

	self.disable_voting = function() {
		if (!self.songs) {
			return;
		}
		for (var i = 0; i < self.songs.length; i++) {
			self.songs[i].disable_voting();
		}
		self.set_header_text();
	};

	self.register_vote = function(entry_id) {
		if (!self.songs) return;
		for (var i = 0; i < self.songs.length; i++) {
			if (entry_id == self.songs[i].data.entry_id) {
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

	self.set_header_text = function() {
		if (self.type == "OneUp") {
			header_text.textContent = current_header_default_text + " - " + self.name + " " + $l("power_hour");
		}
		else if (self.type != "Election" && $l_has(self.type.toLowerCase())) {
			header_text.textContent = current_header_default_text + " - " + $l(self.type.toLowerCase());
			if (self.name) {
				header_text.textContent += " - " + self.name;
			}
		}
		else if (!now_playing && self.type == "Election" && self.data.voting_allowed) {
			header_text.textContent = current_header_default_text + " - " + $l("vote_now");
		}
		else if (self.name) {
			header_text.textContent = current_header_default_text + " - " + self.name;
		}
		else {
			header_text.textContent = current_header_default_text;
		}
		if (self.data.url) {
			header_text.setAttribute("href", self.data.url);
			header_text.setAttribute("target", "_blank");
			Formatting.linkify_external(header_text);
			$add_class(header_text, "link");
		}
		else {
			Formatting.unlinkify(header_text);
			header_text.removeAttribute("href");
			header_text.removeAttribute("target");
			$remove_class(header_text, "link");
		}
		self.header_text = header_text.textContent;
	};

	self.hide_header = function() {
		if (!$add_class(self.el, "timeline_event_sequence")) return;
		Fx.delay_css_setting(header, "opacity", 0);
		Fx.delay_css_setting(header, "height", 0);
		Fx.delay_css_setting(header, "padding", 0);
	};

	self.show_header = function() {
		if (!$remove_class(self.el, "timeline_event_sequence")) return;
		Fx.delay_css_setting(header, "opacity", null);
		Fx.delay_css_setting(header, "height", null);
		Fx.delay_css_setting(header, "padding", null);
	};

	self.progress_bar_start = function() {
		progress_bar_update();
		header_inside_bar.style.opacity = 1;
		Clock.pageclock_bar_function = progress_bar_update;
	};

	var progress_bar_update = function() {
		var new_val = Math.min(Math.max(Math.floor(((self.end - Clock.now) / (self.data.songs[0].length - 1)) * 100), 0), 100);
		header_inside_bar.style.width = new_val + "%";
	};

	draw();
	if (self.data.voting_allowed) {
		self.enable_voting();
	}
	return self;
};
 