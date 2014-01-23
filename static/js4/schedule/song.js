var TimelineSong = function(json) {
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
		
		self.elements.votes = self.el.appendChild($el("div", { "class": "votes" }));
		if (self.data.entry_votes) {
			self.elements.votes.textContent = self.data.entry_votes;
		}

		self.elements.art_container = self.el.appendChild($el("div", { "class": "art_container" }));
		if (!self.data.albums[0].art) {
			self.elements.art = self.elements.art_container.appendChild($el("img", { "class": "art", "src": "/static/images4/noart_1.jpg" }));
		}
		else {
			self.elements.art = self.elements.art_container.appendChild($el("img", { "class": "art", "src": self.data.albums[0].art + "_120.jpg" }));
		}
		
		self.elements.title_group = self.el.appendChild($el("div", { "class": "title_group" }));
		self.elements.song_rating = self.elements.title_group.appendChild(song_rating.el);
		self.elements.title = self.elements.title_group.appendChild($el("div", { "class": "title", "textContent": self.data.title }));
		self.elements.title.addEventListener("click", vote);
		
		self.elements.album_group = self.el.appendChild($el("div", { "class": "album_group" }));
		self.elements.album_rating = self.elements.album_group.appendChild(album_rating.el);
		self.elements.album = self.elements.album_group.appendChild($el("div", { "class": "album", "textContent": self.data.albums[0].name }));
		// TODO: linkify album

		if (self.data.elec_request_username) {
			self.elements.requester = self.el.appendChild($el("div", { 
				"class": "requester",
				"textContent": $l("requestedby", { "requester": self.data.elec_request_username })
			}));
		}
		
		self.elements.artist_group = self.el.appendChild($el("div", { "class": "artist_group" }));
		Artists.append_spans_from_json(self.elements.artist_group, self.data.artists);

		if (self.data.url && self.data.link_text) {
			self.elements.xlink = self.el.appendChild($el("a", { "target": "_blank", "href": self.data.url, "textContent": self.data.link_text }));
			Formatting.linkify_external(self.elements.xlink);
		}
	};

	self.update = function(new_json) {
		self.data = json;
		if (self.data.entry_votes) {
			self.elements.votes.textContent = self.data.entry_votes;
		}
		song_rating.update(new_json.rating_user, new_json.rating, new_json.fave, new_json.rating_allowed);
		album_rating.update(new_json.albums[0].rating_user, new_json.albums[0].rating, new_json.albums[0].fave, false);
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
		$add_class(self.el, "voting_registered");
	};

	draw();

	return self;
};
