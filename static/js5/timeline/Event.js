var Event = function(self) {
	"use strict";
	self.type = self.type.toLowerCase();
	self.header_text = null;
	if (!self.used && (self.type.indexOf("election") != -1)) {
		shuffle(self.songs);
	}
	RWTemplates.timeline.event(self);

	for (var i = 0; i < self.songs.length; i++) {
		self.songs[i] = Song(self.songs[i]);
		self.$t.el.appendChild(self.songs[i].el);
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
		self.$t.el.classList.remove("sched_history");
		self.$t.el.classList.remove("sched_current");
		self.$t.el.classList.add("sched_next");
		self.check_voting();
		self.set_header_text($l("coming_up"));
	};

	self.change_to_now_playing = function() {
		self.$t.el.classList.remove("sched_next");
		self.$t.el.classList.remove("sched_history");
		self.$t.el.classList.add("sched_current");
		Clock.pageclock = self.$t.clock;
		var i;
		if (self.songs && (self.songs.length > 1)) {
			// other places in the code rely on songs[0] to be the winning song
			// make sure we sort properly for that condition here
			self.songs.sort(function(a, b) { return a.entry_position < b.entry_position ? -1 : 1; });
			for (i = 0; i < self.songs.length; i++) {
				self.$t.el.appendChild(self.songs[i].el);
			}
		}
		self.check_voting();
		self.set_header_text($l("now_playing"));
	};

	self.change_to_history = function() {
		self.$t.el.classList.remove("sched_current");
		self.$t.el.classList.remove("sched_next");
		self.$t.el.classList.add("sched_history");
		self.songs.sort(function(a, b) { return a.entry_position < b.entry_position ? -1 : 1; });
		// neither will reclassing the songs that lost
		for (var i = 1; i < self.songs.length; i++) {
			self.$t.el.appendChild(self.songs[i].el);
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

	self.unregister_vote = function() {
		for (var i = 0; i < self.songs.length; i++) {
			self.songs[i].unregister_vote();
		}
	};

	self.set_header_text = function(default_text) {
		var event_desc = Formatting.event_name(self.type, self.name);
		if (event_desc && !self.voting_allowed) {
			self.$t.header.textContent = default_text + " - " + event_desc;
		}
		else if (event_desc && self.voting_allowed) {
			self.$t.header.textContent = event_desc + " - " + $l("vote_now");
		}
		else if (self.voting_allowed) {
			self.$t.header.textContent = default_text + " - " + $l("vote_now");
		}
		else {
			self.$t.header.textContent = default_text;
		}
		if (self.url) {
			self.$t.header.setAttribute("href", self.url);
			self.$t.header.setAttribute("target", "_blank");
			self.$t.header.classList.add("link");
		}
		else {
			self.$t.header.removeAttribute("href");
			self.$t.header.removeAttribute("target");
			self.$t.header.classList.remove("link");
		}
		self.header_text = self.$t.header.textContent;
	};

	self.hide_header = function() {
		self.$t.header.classList.add("no_header");
	};

	self.show_header = function() {
		self.$t.header.classList.remove("no_header");
	};

	self.progress_bar_start = function() {
		progress_bar_update();
		Clock.pageclock_bar_function = progress_bar_update;
	};

	var progress_bar_update = function() {
		var new_val = Math.min(Math.max(Math.floor(((self.end - Clock.now) / (self.songs[0].length - 1)) * 100), 0), 100);
		self.$t.progress.style.width = new_val + "%";
	};

	self.destroy = function() {
		for (var i = 0; i < self.songs.length; i++) {
			self.songs[i].destroy();
		}
	};

	return self;
};
