var TimelineSong = function() {
	"use strict";
	var cls = {};
	cls.calculate_height = function() {
		cls.height = SmallScreen ? 55 : 70;
	};
	cls.calculate_height();

	cls.new = function(json, request_mode) {
		var self = {};
		self.data = json;
		self.elements = {};

		var voting_enabled = false;

		var song_rating = "rating" in json ? SongRating(json) : null;
		// ugh, had to add this in way late in development to allow Schedule to see the real, current song rating
		self.song_rating = song_rating;
		var album_rating = "rating" in json.albums[0] ? AlbumRating(json.albums[0]) : null;

		self.vote = function(evt) {
			if (!voting_enabled) {
				return;
			}
			if ($has_class(self.el, "voting_registered")) {
				return;
			}
			$add_class(self.el, "voting_clicked");
			API.async_get("vote", { "entry_id": self.data.entry_id });
		};

		var draw = function() {
			self.el = $el("div", { "class": "timeline_song" });
			
			if (request_mode) {
				self.elements.request_cancel = $el("div", { "class": "request_cancel", "textContent": "x" });
				self.elements.request_cancel.addEventListener("click", function() { Requests.delete(self.data.id); });
				self.el.appendChild(self.elements.request_cancel);
			}

			self.elements.album_art = self.el.appendChild(Albums.art_html(self.data.albums[0], null, request_mode));
			self.elements.album_art.addEventListener("click", function(e) { e.stopPropagation(); });
			if (request_mode) {
				self.elements.request_drag = $el("div", { "class": "request_sort_grab" });
				self.elements.request_drag._song_id = json.id;
				self.elements.request_drag.appendChild($el("img", { "src": "/static/images4/sort.svg" }));
				self.elements.album_art.insertBefore(self.elements.request_drag, self.elements.album_art.firstChild);
			}
			else if (self.data.elec_request_username) {
				$add_class(self.el, "requested");
				self.elements.requester = self.elements.album_art.firstChild.appendChild($el("div", { 
					"class": "requester",
					"textContent": $l("timeline_art__request_indicator")
				}));
				if (self.data.elec_request_user_id == User.id) {
					$add_class(self.elements.requester, "your_request");
					self.elements.requester.textContent = $l("timeline_art__your_request_indicator");
					if (Prefs.get("stage") < 4) {
						Prefs.change("stage", 4);
					}
				}
			}

			// c for content, this stuff should be pushed aside from the album art 
			var c = $el("div", { "class": "timeline_song_content" });
			
			var title_group = c.appendChild($el("div", { "class": "title_group" }));

			if (song_rating) title_group.appendChild(song_rating.el);

			self.elements.title = title_group.appendChild($el("div", { "class": "title", "textContent": self.data.title, "title": self.data.title }));
			self.el.addEventListener("mouseover", self.title_mouse_over);
			self.el.addEventListener("mouseout", self.title_mouse_out);
			self.el.addEventListener("click", self.vote);	
			if (song_rating) song_rating.rating_title_el = self.elements.title;

			var album_group = c.appendChild($el("div", { "class": "album_group" }));

			if (album_rating) album_group.appendChild(album_rating.el);

			self.elements.album = album_group.appendChild($el("div", { "class": "album" }));
			self.elements.album_name = self.elements.album.appendChild($el("span", { "textContent": self.data.albums[0].name, "class": "album_name", "title": self.data.albums[0].name }));
			if (self.data.albums[0].id && !MOBILE) {
				self.elements.album_name.className = "album_name link";
				self.elements.album_name.addEventListener("click", function(e) { e.stopPropagation(); DetailView.open_album(self.data.albums[0].id ); });
			}
			if (album_rating) album_rating.rating_title_el = self.elements.album;
			
			if ("artists" in self.data) {
				self.elements.artists = c.appendChild($el("div", { "class": "artist" }));
				Artists.append_spans_from_json(self.elements.artists, self.data.artists);
			}

			if (self.data.url && self.data.link_text) {
				self.elements.xlink = c.appendChild($el("a", { "class": "song_link", "target": "_blank", "href": self.data.url }));
				self.elements.xlink.appendChild($el("img", { "src": "/static/images4/link_external.svg", "class": "link_external" }));
				self.elements.xlink.appendChild($el("span", { "textContent": self.data.link_text }));
				Formatting.linkify_external(self.elements.xlink);
			}

			if (request_mode) {
				self.elements.cooldown = c.appendChild($el("div", { "class": "cooldown_info" }));
				self.update_cooldown_info();
			}

			self.el.appendChild(c);
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
			self.data = new_json;
			self.data.entry_position = new_json.entry_position;
			if (song_rating) song_rating.update(new_json.rating_user, new_json.rating, new_json.fave, new_json.rating_allowed);
			if (album_rating) album_rating.update(new_json.albums[0].rating_user, new_json.albums[0].rating, new_json.albums[0].fave, false);
			self.update_cooldown_info();
		};

		self.update_cooldown_info = function() {
			if (!self.elements.cooldown) {
				// nothing
			}
			else if (("valid" in self.data) && !self.data.valid) {
				$add_class(self.el, "timeline_song_is_cool");
				self.elements.cooldown.textContent = $l("request_only_on_x", { "station": $l("station_name_" + self.data.sid) });
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
				self.elements.cooldown.textContent = $l("request_in_election", { "blocked_by": $l("blocked_by_name__" + self.data.elec_blocked_by.toLowerCase()) });
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

		self.rate = function(new_rating) {
			song_rating.rate(new_rating);
		};

		draw();

		return self;
	};

	return cls;
}();
