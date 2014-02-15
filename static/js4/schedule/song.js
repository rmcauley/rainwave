var TimelineSong = function() {
	var cls = {};
	cls.calculate_height = function() {
		cls.height = SmallScreen ? 55 : 70;
	};
	cls.calculate_height();

	cls.new = function(json, request_mode) {
		"use strict";
		var self = {};
		self.data = json;
		self.elements = {};

		var voting_enabled = false;

		var song_rating = SongRating(json);
		var album_rating = AlbumRating(json.albums[0]);

		var vote = function(evt) {
			if (!voting_enabled) {
				return;
			}
			$add_class(self.el, "voting_clicked");
			API.async_get("vote", { "entry_id": self.data.entry_id });
		};

		var draw = function() {
			self.el = $el("div", { "class": "timeline_song" });
			
			if (!request_mode) {
				self.elements.votes = self.el.appendChild($el("div", { "class": "votes" }));
				if (self.data.entry_votes) {
					self.elements.votes.textContent = self.data.entry_votes;
				}
			}

			self.elements.album_art = self.el.appendChild(Albums.art_html(self.data.albums[0]));
			
			self.elements.title_group = self.el.appendChild($el("div", { "class": "title_group" }));
			if (request_mode) {
				self.elements.request_cancel = $el("img", { "class": "request_cancel", "src": "/static/images4/cancel_ldpi.png", "alt": "X", "title": $l("cancel_request") });
				self.elements.request_cancel.addEventListener("mouseover", function() { $add_class(self.el, "timeline_song_request_cancel_hover"); });
				self.elements.request_cancel.addEventListener("mouseout", function() { $remove_class(self.el, "timeline_song_request_cancel_hover"); });
				self.elements.request_cancel.addEventListener("click", function() { Requests.delete(self.data.id); });
				self.elements.title_group.appendChild(self.elements.request_cancel);
			}
			self.elements.title_group.addEventListener("mouseover", self.title_mouse_over);
			self.elements.title_group.addEventListener("mouseout", self.title_mouse_out);
			self.elements.song_rating = self.elements.title_group.appendChild(song_rating.el);
			self.elements.title = self.elements.title_group.appendChild($el("div", { "class": "title", "textContent": self.data.title }));
			self.elements.title.addEventListener("click", vote);
			
			self.elements.album_group = self.el.appendChild($el("div", { "class": "album_group" }));
			if (request_mode) {
				self.elements.request_drag = $el("img", { "class": "request_reorder", "src": "/static/images4/pin_hdpi.png", "width": 14, "height": 14, "alt": "<>" });
				self.elements.request_drag._song_id = json.id;
				self.elements.album_group.appendChild(self.elements.request_drag);
			}
			self.elements.album_rating = self.elements.album_group.appendChild(album_rating.el);
			self.elements.album = self.elements.album_group.appendChild($el("div", { "class": "album", "textContent": self.data.albums[0].name }));
			self.elements.album.addEventListener("click", function() { API.async_get("album", { "id": self.data.albums[0].id }); });

			if (self.data.elec_request_username) {
				self.elements.requester = self.el.appendChild($el("div", { 
					"class": "requester",
					"textContent": $l("requestedby", { "requester": self.data.elec_request_username })
				}));
			}
			
			if ("artists" in self.data) {
				self.elements.artist_group = self.el.appendChild($el("div", { "class": "artist_group" }));
				Artists.append_spans_from_json(self.elements.artist_group, self.data.artists);
			}

			if (self.data.url && self.data.link_text) {
				self.elements.xlink = self.el.appendChild($el("a", { "target": "_blank", "href": self.data.url, "textContent": self.data.link_text }));
				Formatting.linkify_external(self.elements.xlink);
			}

			if (request_mode) {
				self.elements.cooldown = self.el.appendChild($el("div", { "class": "cooldown_info" }));
				self.update_cooldown_info();
			}
		};

		self.title_mouse_over = function(e) {
			if (voting_enabled) {
				$add_class(self.el, "voting_hover");
			}
		};

		self.title_mouse_out = function(e) {
			$remove_class(self.el, "voting_hover");
		}

		self.update = function(new_json) {
			self.data = json;
			if (self.data.entry_votes) {
				self.elements.votes.textContent = self.data.entry_votes;
			}
			self.data.entry_position = new_json.entry_position;
			song_rating.update(new_json.rating_user, new_json.rating, new_json.fave, new_json.rating_allowed);
			album_rating.update(new_json.albums[0].rating_user, new_json.albums[0].rating, new_json.albums[0].fave, false);
			self.update_cooldown_info();
		};

		self.update_cooldown_info = function() {
			if (!self.elements.cooldown) {
				// nothing
			}
			else if (self.data.cool && (self.data.cool_end > (Clock.now + 20))) {
				$add_class(self.el, "timeline_song_is_cool");
				self.elements.cooldown.textContent = $l("request_on_cooldown_for", { "cool_time": Formatting.cooldown(self.data.cool_end - Clock.now) });
			}
			else if (self.data.cool) {
				$add_class(self.el, "timeline_song_is_cool");
				self.elements.cooldown.textContent = $l("request_on_cooldown_ends_soon");
			}
			else if (self.data.elec_blocked) {
				$add_class(self.el, "timeline_song_is_cool");
				self.data.elec_blocked_by = self.data.elec_blocked_by.charAt(0).toUpperCase() + self.data.elec_blocked_by.slice(1);
				self.elements.cooldown.textContent = $l("request_in_election", { "blocked_by": self.data.elec_blocked_by });
			}
			else {
				$remove_class(self.el, "timeline_song_is_cool");
			}
		};

		self.enable_voting = function() {
			voting_enabled = true;
			$add_class(self.el, "voting_enabled");
		};

		self.disable_voting = function() {
			voting_enabled = false;
			$remove_class(self.el, "voting_enabled");
		};

		self.clear_voting_status = function() {
			$remove_class(self.el, "voting_clicked");
			$remove_class(self.el, "voting_registered");
			$remove_class(self.el, "voting_enabled");
		};

		self.register_vote = function() {
			$add_class(self.el, "voting_registered");
		};

		self.unregister_vote = function() {
			$remove_class(self.el, "voting_registered");
		};

		draw();

		return self;
	};

	return cls;
}();
