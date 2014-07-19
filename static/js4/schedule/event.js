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
	var header_text = $el("a");
	var header_bar = $el("div", { "class": "timeline_header_bar" });
	var header_inside_bar = $el("div", { "class": "timeline_header_bar_inside" });
	var time_bar_progress_timer = false;
	header_bar.appendChild(header_inside_bar);
	header.appendChild(header_text);
	self.header_height = 0;
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
			if (!self.data.used && (self.type.indexOf("election") != -1)) {
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
		self.set_header_text($l("Coming_Up"));
	};

	self.change_to_now_playing = function() {
		$remove_class(self.el, "timeline_next");
		self.set_header_text($l("Now_Playing"));
		if (self.songs && (self.songs.length > 0)) {
			// other places in the code rely on songs[0] to be the winning song
			// make sure we sort properly for that condition here
			self.songs.sort(function(a, b) { return a.data.entry_position < b.data.entry_position ? -1 : 1; });

			for (var i = 0; i < self.songs.length; i++) {
				if (self.songs[i].data.entry_position == 1) {
					$add_class(self.songs[i].el, "timeline_now_playing_song");
				}
			}
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

	self.set_header_text = function(default_text) {
		if (self.type == "OneUp") {
			header_text.textContent = default_text + " - " + self.name + " " + $l("Power_Hour");
		}
		else if ($l_has(self.type)) {
			header_text.textContent = default_text + " - " + $l(self.type);
			if (self.name) {
				header_text.textContent += " - " + self.name;
			}
		}
		else if (self.name) {
			header_text.textContent = default_text + " - " + self.name;
		}
		else {
			header_text.textContent = default_text;
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
		Fx.delay_css_setting(header, "opacity", 0);	
		Fx.delay_css_setting(header, "height", 0);
		self.header_height = 0;
	};

	self.show_header = function() {
		Fx.delay_css_setting(header, "opacity", 1);
		Fx.delay_css_setting(header, "height", Schedule.header_height + "px");
		self.header_height = Schedule.header_height;
	};

	self.progress_bar_start = function() {
		if (time_bar_progress_timer) clearInterval(time_bar_progress_timer);
		progress_bar_update();
		header_inside_bar.style.opacity = 1;
		time_bar_progress_timer = setInterval(progress_bar_update, 1000);
	};

	self.progress_bar_stop = function() {
		if (time_bar_progress_timer) clearInterval(time_bar_progress_timer);
	};

	var progress_bar_update = function() {
		var new_val = ((self.end - Clock.now) / (self.data.songs[0].length - 1)) * 100;
		if (new_val <= 0) {
			if (time_bar_progress_timer) clearInterval(time_bar_progress_timer);
			time_bar_progress_timer = false;
			header_inside_bar.style.width = "0%";
		}
		else {
			header_inside_bar.style.width = new_val + "%";
		}
	};

	draw();
	if (self.data.voting_allowed) {
		self.enable_voting();
	}
	return self;
};
 