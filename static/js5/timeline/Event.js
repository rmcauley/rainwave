var Event = function(self) {
	"use strict";
	var header_default_text;

	self.type = self.type.toLowerCase();
	if (!self.used && (self.type.indexOf("election") != -1)) {
		shuffle(self.songs);
	}
	self.$template = RWTemplates.timeline.event(self);

	for (var i = 0; i < self.songs.length; i++) {
		self.songs[i] = Song(self.songs[i]);
		self.$template.root.appendChild(self.songs[i].$template.root);
	}

	self.update = function(json) {
		for (var i in json) {
			if (typeof(json[i]) !== "object") {
				self[i] = json[i];
			}
		}

		if (self.songs) {
			var j;
			for (i = 0; i < self.songs.length; i++) {
				for (j = 0; j < json.songs.length; j++) {
					if (self.songs[i].id == json.songs[j].id) {
						self.songs[i].update(json.songs[j]);
					}
				}
			}
		}
	};

	self.change_to_coming_up = function() {
		self.$template.el.classList.remove("sched_history");
		self.$template.el.classList.remove("sched_current");
		self.$template.el.classList.add("sched_next");
		self.set_header_text($l("coming_up"));
		self.check_voting();
	};

	self.change_to_now_playing = function() {
		self.$template.el.classList.remove("sched_next");
		self.$template.el.classList.remove("sched_history");
		self.$template.el.classList.add("sched_current");
		self.set_header_text($l("now_playing"));
		Clock.pageclock = self.elements.header_clock;
		var i;
		if (self.songs && (self.songs.length > 1)) {
			// other places in the code rely on songs[0] to be the winning song
			// make sure we sort properly for that condition here
			self.songs.sort(function(a, b) { return a.entry_position < b.entry_position ? -1 : 1; });
			for (i = 0; i < self.songs.length; i++) {
				self.$template.root.appendChild(self.songs[i].$template.root);
			}
		}
		self.check_voting();
	};

	self.change_to_history = function() {
		self.$template.el.classList.remove("sched_current");
		self.$template.el.classList.remove("sched_next");
		self.$template.el.classList.add("sched_history");
		self.songs.sort(function(a, b) { return a.entry_position < b.entry_position ? -1 : 1; });
		// neither will reclassing the songs that lost
		for (var i = 1; i < self.songs.length; i++) {
			self.$template.root.appendChild(self.songs[i].$template.root);
		}
		self.check_voting();
	};

	self.check_voting = function() {
		if (User.tuned_in && (!User.locked || (User.lock_sid == User.sid))) {
			if (self.voting_allowed) {
				self.enable_voting();
			}
			else if ((self.type == "election") && (self.songs.length > 1) && !self.data.used) {
				self.enable_voting();
			}
			else {
				self.disable_voting();
			}
		}
		else {
			self.disable_voting();
		}
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
		var event_desc = Formatting.event_name(self.type, self.name);
		if (event_desc && !self.data.voting_allowed) {
			header_text.textContent = current_header_default_text + " - " + event_desc;
		}
		else if (event_desc && self.data.voting_allowed) {
			header_text.textContent = event_desc + " - " + $l("vote_now");
		}
		else if (self.data.voting_allowed) {
			header_text.textContent = current_header_default_text + " - " + $l("vote_now");
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
		if (MOBILE) return;
		progress_bar_update();
		header_inside_bar.style.opacity = 1;
		Clock.pageclock_bar_function = progress_bar_update;
	};

	var progress_bar_update = function() {
		var new_val = Math.min(Math.max(Math.floor(((self.end - Clock.now) / (self.data.songs[0].length - 1)) * 100), 0), 100);
		header_inside_bar.style.width = new_val + "%";
	};

	draw();
	self.check_voting();
	return self;
};
