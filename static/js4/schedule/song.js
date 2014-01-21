var TimelineSong = function(json) {
	"use strict";
	var self = {};
	self.data = json;
	self.elements = {};

	var voting_enabled = false;
	var html_classes = [ "timeline_song" ];

	var song_rating = SongRating(json);
	var album_rating = AlbumRating(json.albums[0]);

	var vote = function(evt) {
		if (!voting_enabled) {
			return;
		}
		add_html_class("voting_clicked");
		API.async_get("vote", { "entry_id": self.data.entry_id });
	};

	var remove_html_class = function(cls) {
		var i = html_classes.indexOf(cls);
		if (i != -1) {
			html_classes.splice(i, 1);
			update_html_classes();
		}
	};

	var add_html_class = function() {
		if (html_classes.indexOf("voting_voted") == -1) {
			html_classes.push("voting_voted");
			update_html_classes();
		}
	};

	var update_html_classes = function() {
		self.el.setAttribute("class", html_classes.join(" "));
	};

	var draw = function() {
		self.el = $el("div");
		
		self.elements.votes = self.el.appendChild($el("div", { "class": "votes" }));
		if (self.data.entry_votes) {
			self.elements.votes.textContent = self.data.entry_votes;
		}

		if (!self.data.albums[0].art) {
			self.elements.art = self.el.appendChild($el("img", { "class": "art", "src": "../static/images4/noart_1.jpg" }));
		}
		else {
			self.elements.art = self.el.appendChild($el("img", { "class": "art", "src": ".." + self.data.albums[0].art + "_120.jpg" }));
		}
		
		self.elements.song_rating = self.el.appendChild(song_rating.el);
		self.elements.title = self.el.appendChild($el("div", { "class": "title", "textContent": self.data.title }));
		self.elements.title.addEventListener("click", vote, false);
		
		if (self.data.elec_request_username) {
			self.elements.requester = self.el.appendChild($el("div", { 
				"class": "requester",
				"textContent": $l("requestedby", { "requester": self.data.elec_request_username })
			}));
		}
		
		self.elements.album_rating = self.el.appendChild(album_rating.el);
		self.elements.album = self.el.appendChild($el("div", { "class": "album", "textContent": self.data.albums[0].name }));
		// TODO: linkify album
		
		// TODO: artists
		update_html_classes();
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
		add_html_class("voting_enabled");
	};

	self.disable_voting = function() {
		voting_enabled = false;
		remove_html_class("voting_enabled");
	};

	self.clear_voting_status = function() {
		remove_html_class("voting_clicked");
		remove_html_class("voting_registered");
		remove_html_class("voting_enabled");
	};

	self.register_vote = function() {
		add_html_class("voting_registered");
	};

	self.unregister_vote = function() {
		remove_html_class("voting_registered");
	};

	draw();

	return self;
};
