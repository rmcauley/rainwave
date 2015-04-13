var Event = function(self) {
	"use strict";
	self.type = self.type.toLowerCase();
	self.header_text = null;
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
		self.check_voting();
		self.set_header_text($l("coming_up"));
	};

	self.change_to_now_playing = function() {
		self.$template.el.classList.remove("sched_next");
		self.$template.el.classList.remove("sched_history");
		self.$template.el.classList.add("sched_current");
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
		self.set_header_text($l("now_playing"));
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
			else if ((self.type == "election") && (self.songs.length > 1) && !self.used) {
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
		for (var i = 0; i < self.songs.length; i++) {
			self.songs[i].enable_voting();
		}
	};

	self.disable_voting = function() {
		for (var i = 0; i < self.songs.length; i++) {
			self.songs[i].disable_voting();
		}
	};

	self.set_header_text = function(default_text) {
		var event_desc = Formatting.event_name(self.type, self.name);
		if (event_desc && !self.voting_allowed) {
			self.$template.header_text.textContent = default_text + " - " + event_desc;
		}
		else if (event_desc && self.voting_allowed) {
			self.$template.header_text.textContent = event_desc + " - " + $l("vote_now");
		}
		else if (self.voting_allowed) {
			self.$template.header_text.textContent = default_text + " - " + $l("vote_now");
		}
		else {
			self.$template.header_text.textContent = default_text;
		}
		if (self.url) {
			self.$template.header_text.setAttribute("href", self.url);
			self.$template.header_text.setAttribute("target", "_blank");
			self.$template.header_text.classList.add("link");
		}
		else {
			self.$template.header_text.removeAttribute("href");
			self.$template.header_text.removeAttribute("target");
			self.$template.header_text.classList.remove("link");
		}
		self.header_text = self.$template.header_text.textContent;
	};

	self.hide_header = function() {
		self.$template.header.classList.add("no_header");
	};

	self.show_header = function() {
		self.$template.header.classList.remove("no_header");
	};

	// TODO: Disable the progress bar while in the background

	self.progress_bar_start = function() {
		progress_bar_update();
		self.$template.progress.style.opacity = 1;
		Clock.pageclock_bar_function = progress_bar_update;
	};

	var progress_bar_update = function() {
		var new_val = Math.min(Math.max(Math.floor(((self.end - Clock.now) / (self.songs[0].length - 1)) * 100), 0), 100);
		self.$template.progress.style.width = new_val + "%";
	};

	return self;
};
