var Song = function(self, event) {
	"use strict";
	var template;
	if (!self.$t) {
		var template = RWTemplates.song(self);
		self.el = template.root;
	}
	else {
		template = self.$t;
		self.el = self.$t.root;
	}

	AlbumArt(self.art, template.art);

	if (template.rating) {
		Rating.register(self);
	}
	if (self.albums[0].$t.rating) {
		Rating.register(self.albums[0]);
	}

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

		template.votes.textContent = self.entry_votes;

		if (template.rating) {
			if (self.rating_user) {
				template.rating.classList.add("rating_user");
			}
			else {
				template.rating.classList.remove("rating_user");
			}
		 	template.rating.rating_set(self.rating_user || self.rating);
		}
		if (self.albums[0].$t.rating) {
			if (self.rating_user) {
				self.albums[0].$t.rating.classList.add("rating_user");
			}
			else {
				self.albums[0].$t.rating.classList.remove("rating_user");
			}
		 	self.albums[0].$t_el.rating_set(self.rating_user || self.rating);
		}

		self.update_cooldown_info();
	};

	self.update_cooldown_info = function() {
		if (!template.cooldown) {
			// nothing
		}
		else if (("valid" in self) && !self.valid) {
			self.el.classList.add("timeline_song_is_cool");
			template.cooldown.textContent = $l("request_only_on_x", { "station": $l("station_name_" + self.origin_sid) });
		}
		else if (self.cool && (self.cool_end > (Clock.now + 20))) {
			self.el.classList.add("timeline_song_is_cool");
			template.cooldown.textContent = $l("request_on_cooldown_for", { "cool_time": Formatting.cooldown(self.cool_end - Clock.now) });
		}
		else if (self.cool) {
			self.el.classList.add("timeline_song_is_cool");
			template.cooldown.textContent = $l("request_on_cooldown_ends_soon");
		}
		else if (self.elec_blocked) {
			self.el.classList.add("timeline_song_is_cool");
			self.elec_blocked_by = self.elec_blocked_by.charAt(0).toUpperCase() + self.elec_blocked_by.slice(1);
			template.cooldown.textContent = $l("request_in_election", { "blocked_by": $l("blocked_by_name__" + self.elec_blocked_by.toLowerCase()) });
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
		self.el.classList.remove("voting_enabled");
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

	return self;
};
