var TimelineSong = function(self, event) {
	"use strict";
	self.$template = RWTemplates.song(self);
	self.el = self.$template.root;

	var voting_enabled = false;
	self.vote = function(evt) {
		if (!voting_enabled) {
			return;
		}
		self.el.classList.add("voting_clicked");
		API.async_get("vote", { "entry_id": self.entry_id });
	};

	self.update = function(json) {
		for (var i in json) {
			if (typeof(json[i]) !== "object") {
				self[i] = json[i];
			}
		}

		self.$template.votes.textContent = self.entry_votes;

		if (self.rating && self.rating.update) {
		 	self.rating.update(self);
		}
		if (self.albums[0].album_rating && self.albums[0].album_rating.update) {
		 	self.albums[0].rating.update(self.albums[0]);
		}

		self.update_cooldown_info();
	};

	self.update_cooldown_info = function() {
		if (!self.$template.cooldown) {
			// nothing
		}
		else if (("valid" in self) && !self.valid) {
			self.el.classList.add("timeline_song_is_cool");
			self.$template.cooldown.textContent = $l("request_only_on_x", { "station": $l("station_name_" + self.origin_sid) });
		}
		else if (self.cool && (self.cool_end > (Clock.now + 20))) {
			self.el.classList.add("timeline_song_is_cool");
			self.$template.cooldown.textContent = $l("request_on_cooldown_for", { "cool_time": Formatting.cooldown(self.cool_end - Clock.now) });
		}
		else if (self.cool) {
			self.el.classList.add("timeline_song_is_cool");
			self.elements.cooldown.textContent = $l("request_on_cooldown_ends_soon");
		}
		else if (self.elec_blocked) {
			self.el.classList.add("timeline_song_is_cool");
			self.elec_blocked_by = self.elec_blocked_by.charAt(0).toUpperCase() + self.elec_blocked_by.slice(1);
			self.elements.cooldown.textContent = $l("request_in_election", { "blocked_by": $l("blocked_by_name__" + self.elec_blocked_by.toLowerCase()) });
		}
		else {
			self.el.classList.remove("timeline_song_is_cool");
		}
	};

	self.enable_voting = function() {
		voting_enabled = true;
		self.el.classList.add("voting_enabled");
	};

	self.disable_voting = function() {
		voting_enabled = false;
		self.el.classList.add("voting_enabled");
	};

	self.clear_voting_status = function() {
		self.el.classList.remove("voting_clicked");
		self.el.classList.remove("voting_registered");
		self.el.classList.remove("voting_enabled");
	};

	self.register_vote = function() {
		self.el.classList.add("voting_registered");
	};

	self.unregister_vote = function() {
		self.el.classList.remove("voting_registered");
	};

	self.rate = function(new_rating) {
		self.rating.rate(new_rating);
	};

	self.destroy = function() {
		// clean up ratings
	};

	return self;
};
