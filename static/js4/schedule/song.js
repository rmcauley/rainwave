'use strict';

function TimelineSong(json) {
	var self;
	self.data = json;
	self.elements = {};

	var voting_enabled = false;
	var html_classes = [ "TimelineSong" ];

	var vote = function(e) {
		if (!voting_enabled) {
			return;
		}
		add_html_class("voting_clicked");
		API.async_get("vote", { "entry_id": self.data.entry_id });
	}

	var remove_html_class = function(cls) {
		if (var i = html_classes.indexOf(cls)) {
			html_classes.splice(i, 1);
			update_html_classes();
		}
	}

	var add_html_class = function() {
		if (html_classes.indexOf("voting_voted") == -1) {
			html_classes.push("voting_voted");
			update_html_classes();
		}
	}

	var update_html_classes = function() {
		self.el.setAttribute("class", html_classes.join(" "));
	}

	var draw = function() {
		self.el = $el("div");
		
		self.elements.votes = self.el.appendChild($el("div", { "class": "votes" }));
		if (self.data.entry_votes) {
			self.elements.votes.textContent = self.data.entry_votes;
		}

		if (!self.data.albums[0].art) {
			self.data.albums[0].art = "/images/noart_1.jpg";
		}
		self.elements.art = self.el.appendChild($el("img", { "class": "art", "src": self.data.albums[0].art }));
		
		// TODO: song rating
		self.elements.title = self.el.appendChild($el("div", { "class": "title", "textContent": self.data.title }));
		self.elements.title.addEventListener("click", vote, false);
		
		if (self.data.elec_request_username) {
			self.elements.requester = self.el.appendChild($el("div", { 
				"class": "requester",
				"textContent": $l("requestedby", { "requester": self.data.elec_request_username })
			}));
		}
		
		// TODO: album rating
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
		// update ratings / check rating_allowed
	};

	self.enable_voting = function() {
		voting_enabled = true;
		add_html_class("voting_enabled");
	}

	self.disable_voting = function() {
		voting_enabled = false;
		remove_html_class("voting_enabled");
	}

	self.clear_voting_status = function() {
		remove_html_class("voting_clicked");
		remove_html_class("voting_registered");
		remove_html_class("voting_enabled");
	}

	self.register_vote = function() {
		add_html_class("voting_registered");
	}

	self.unregister_vote = function() {
		remove_html_class("voting_registered");
	}

	return self;
};
