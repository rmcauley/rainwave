var Song = function(self, parent_event) {
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
	if (template.fave) {
		Fave.register(self);
	}
	if (self.albums[0].$t.fave) {
		Fave.register(self.albums[0], true);
	}

	self.vote = function(evt) {
		if (self.el.classList.contains("voting_registered") || self.el.classList.contains("voting_clicked")) {
			return;
		}
		self.el.classList.add("voting_clicked");
		API.async_get("vote", { "entry_id": self.entry_id },
			self.register_vote,
			function(json) {
				self.el.classList.add("voting_error");
				setTimeout(function() { self.el.classList.remove("voting_error"); }, 2000);
			});
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
		 	self.albums[0].$t.el.rating_set(self.rating_user || self.rating);
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
		self.el.classList.add("voting_enabled");
		self.el.addEventListener("click", self.vote);
	};

	self.disable_voting = function() {
		self.el.classList.remove("voting_enabled");
		self.el.classList.remove("voting_clicked");
		self.el.removeEventListener("click", self.vote);
	};

	self.clear_voting_status = function() {
		self.el.classList.remove("voting_clicked");
		self.el.classList.remove("voting_registered");
		self.el.classList.remove("voting_enabled");
	};

	self.register_vote = function() {
		self.el.classList.remove("voting_clicked");
		self.el.classList.add("voting_registered");
		for (var i = 0; i < parent_event.songs.length; i++) {
			if (parent_event.songs[i].id != self.id) {
				parent_event.songs[i].unregister_vote();
			}
		}
	};

	self.unregister_vote = function() {
		self.el.classList.remove("voting_clicked");
		self.el.classList.remove("voting_registered");
	};

	return self;
};
