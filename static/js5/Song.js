var held_vote_song;
var held_vote_song_event;
var vote_timeout;
var last_vote;

var Song = function(self, parent_event) {
	"use strict";
	var template;
	if (!self.$t) {
		template = RWTemplates.song(self);
		self.$t = template;
		self.el = template.root;
	}
	else {
		template = self.$t;
		self.el = self.$t.root;
	}

	self.autovoted = false;

	AlbumArt(self.art || (self.albums.length ? self.albums[0].art : null), template.art, self.request_id);
	template.art._reset_router = false;

	if (template.rating) {
		Rating.register(self);
	}
	if (self.albums[0].$t.rating) {
		Rating.register(self.albums[0]);
	}
	if (("valid" in self) && !self.valid) {
		if (template.fave) {
			self.$t.fave.parentNode.removeChild(self.$t.fave);
		}
		if (self.albums[0].$t.fave) {
			self.albums[0].$t.fave.parentNode.removeChild(self.albums[0].$t.fave);
		}
	}
	else{
		if (template.fave) {
			Fave.register(self);
		}
		if (self.albums[0].$t.fave) {
			Fave.register(self.albums[0], true);
		}
	}
	if (template.votes && self.entry_votes) {
		if (Sizing.simple) template.votes.textContent = $l("num_votes", { "num_votes": self.entry_votes });
		else template.votes.textContent = self.entry_votes;
	}

	self.vote = function(e) {
		if (e && (e.target.nodeName.toLowerCase() == "a") && e.target.getAttribute("href")) {
			return;
		}
		if (held_vote_song && (held_vote_song_event == parent_event)) {
			// pass
		}
		else if ((!self.autovoted && self.el.classList.contains("voting_registered")) || self.el.classList.contains("voting_clicked")) {
			return;
		}
		if (self.autovoted) {
			self.el.classList.add("no_transition");
			self.el.classList.remove("autovoted");
			self.el.classList.remove("voting_clicked");
			self.el.classList.remove("voting_registered");
			self.autovoted = false;
			requestNextAnimationFrame(function() {
				self.el.classList.remove("no_transition");
				self.vote();
			});
			return;
		}
		Timeline.votes_this_election++;
		if ((Timeline.votes_this_election >= (User.perks ? 6 : 3)) && (last_vote > (Clock.now - 6))) {
			last_vote = Clock.now;
			parent_event.unregister_vote();
			if (held_vote_song_event && (held_vote_song_event !== parent_event)) {
				held_vote_song_event.unregister_vote();
			}
			self.el.classList.remove("voting_clicked_long");
			self.el.classList.add("voting_clicked");
			if (!Timeline.votes_limit_hit) {
				ErrorHandler.tooltip_error(ErrorHandler.make_error("websocket_throttle", 403));
			}
			Timeline.votes_limit_hit = true;
			self.el.classList.add("voting_clicked_long");
			if (held_vote_song) {
				held_vote_song.unregister_vote();
			}
			// TODO:
			/*
				A vote that's been held back here through this method will need to be
				re-registered as the actual vote if the vote is moved somewhere else.
				Uuuuuuuugh.
			*/
			if (vote_timeout) {
				clearTimeout(vote_timeout);
			}
			vote_timeout = setTimeout(self.vote, 6000);
			held_vote_song = self;
			held_vote_song_event = parent_event;
			return;
		}
		if (vote_timeout) {
			clearTimeout(vote_timeout);
		}
		last_vote = Clock.now;
		self.el.classList.remove("voting_clicked_long");
		self.el.classList.add("voting_clicked");
		held_vote_song = null;
		held_vote_song_event = null;
		API.async_get("vote", { "entry_id": self.entry_id },
			null,
			function(json) {
				if (json.tl_key == "websocket_throttle") {
					Timeline.votes_this_election = 1000;
					Timeline.votes_limit_hit = true;
				}
				self.el.classList.add("voting_error");
				self.el.classList.remove("voting_clicked");
				setTimeout(function() { self.el.classList.remove("voting_error"); }, 2000);
			});
	};

	self.update = function(json) {
		for (var i in json) {
			if (typeof(json[i]) !== "object") {
				self[i] = json[i];
			}
		}

		if (template.votes) {
			if (!self.entry_votes) {
				template.votes.textContent = "";
			}
			else if (Sizing.simple) {
				template.votes.textContent = $l("num_votes", { "num_votes": self.entry_votes });
			}
			else {
				template.votes.textContent = self.entry_votes;
			}
		}

		if (template.rating) {
			if (self.rating_user) {
				template.rating.classList.add("rating_user");
			}
			else if (!template.rating.classList.contains("rating_user")) {
				template.rating.classList.remove("rating_user");
				template.rating.rating_set(self.rating);
			}
		}
		if (self.albums[0].$t.rating) {
			if (self.albums[0].rating_user) {
				self.albums[0].$t.rating.classList.add("rating_user");
			}
			else if (!self.albums[0].$t.rating.classList.contains("rating_user")) {
				self.albums[0].$t.rating.classList.remove("rating_user");
				self.albums[0].$t.rating.rating_set(self.albums[0].rating);
			}
		}

		self.update_cooldown_info();
	};

	self.update_cooldown_info = function() {
		if (!template.cooldown) {
			// nothing
		}
		else if (("valid" in self) && !self.valid && (self.sid !== User.sid)) {
			self.el.classList.add("cool");
			template.cooldown.textContent = $l("request_only_on_x", { "station": $l("station_name_" + self.origin_sid) });
		}
		else if (self.cool && (self.cool_end > (Clock.now + 20))) {
			self.el.classList.add("cool");
			template.cooldown.textContent = $l("request_on_cooldown_for", { "cool_time": Formatting.cooldown(self.cool_end - Clock.now) });
		}
		else if (self.cool) {
			self.el.classList.add("cool");
			template.cooldown.textContent = $l("request_on_cooldown_ends_soon");
		}
		else if (self.elec_blocked) {
			self.el.classList.add("cool");
			self.elec_blocked_by = self.elec_blocked_by.charAt(0).toUpperCase() + self.elec_blocked_by.slice(1);
			template.cooldown.textContent = $l("request_in_election", { "blocked_by": $l("blocked_by_name__" + self.elec_blocked_by.toLowerCase()) });
		}
		else {
			self.el.classList.remove("cool");
		}
	};

	self.enable_voting = function() {
		self.el.classList.add("voting_enabled");
		self.el.addEventListener("click", self.vote);
	};

	self.disable_voting = function() {
		self.el.classList.remove("voting_enabled");
		// self.el.classList.remove("voting_clicked");
		self.el.removeEventListener("click", self.vote);
	};

	self.clear_voting_status = function() {
		self.el.classList.remove("voting_clicked");
		self.el.classList.remove("voting_registered");
		self.el.classList.remove("voting_enabled");
		if (self.$t.vote_button_text) {
			self.$t.vote_button_text.textContent = $l("vote");
		}
	};

	self.remove_autovote = function() {
		self.el.classList.remove("autovoted");
		self.autovoted = false;
	};

	self.register_vote = function() {
		self.remove_autovote();
		self.el.classList.remove("voting_clicked");
		self.el.classList.add("voting_registered");
		if (self.$t.vote_button_text) {
			self.$t.vote_button_text.textContent = $l("voted");
		}
		for (var i = 0; i < parent_event.songs.length; i++) {
			if (parent_event.songs[i].id != self.id) {
				parent_event.songs[i].unregister_vote();
			}
		}
	};

	self.unregister_vote = function() {
		self.el.classList.remove("voting_clicked");
		self.el.classList.remove("voting_registered");
		if (self.$t.vote_button_text) {
			self.$t.vote_button_text.textContent = $l("vote");
		}
	};

	if (self.entry_id) {
		var indicators = [];

		var indicate = function(diff) {
			var div = document.createElement("div");
			if (diff <= 0) {
				div.className = "plusminus negative";
				div.textContent = diff;
			}
			else {
				div.className = "plusminus positive";
				div.textContent = "+" + diff;
			}
			template.votes.parentNode.insertBefore(div, template.votes);
			for (var i = 0; i < indicators.length; i++) {
				if (Sizing.simple) {
					indicators[i].style[Fx.transform] = "translateX(" + ((indicators.length - i) * 23) + "px)";
				}
				else {
					indicators[i].style[Fx.transform] = "translateX(-100%) translateX(-" + ((indicators.length - i) * 23 + 5) + "px)";
				}
				indicators[i].style.opacity = 0.7;
			}
			while (indicators.length >= 3) {
				Fx.remove_element(indicators.shift());
			}
			indicators.push(div);
			requestNextAnimationFrame(function() {
				div.classList.add("show");
			});
			setTimeout(function() {
				if (indicators.indexOf(div) !== -1) {
					Fx.remove_element(div);
					indicators.splice(indicators.indexOf(div), 1);
				}
			}, 2000);
		};

		self.live_voting = function(json) {
			if (MOBILE) return;

			var diff = json.entry_votes - self.entry_votes;
			self.entry_votes = json.entry_votes;

			if (!document[visibilityEventNames.hidden] && diff) {
				indicate(diff);
			}

			if (!json.entry_votes) {
				template.votes.textContent = "";
			}
			else if (Sizing.simple) {
				template.votes.textContent = $l("num_votes", { "num_votes": json.entry_votes });
			}
			else {
				template.votes.textContent = json.entry_votes;
			}
		};
	}

	return self;
};
