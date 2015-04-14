var Rating = function() {
	"use strict";
	var self = {};
	self.album_rating_callback = null;

	self.initialize = function() {
		API.add_callback(rating_user_callback, "rate_result");
		API.add_callback(song_fave_update, "fave_song_result");
		API.add_callback(album_fave_update, "fave_album_result");

		// was originally a playlist pref, now lives here
		Prefs.define("playlist_show_rating_complete", [ false, true ]);
		Prefs.add_callback("playlist_show_rating_complete", rating_complete_toggle);

		Prefs.define("hide_global_ratings", [ false, true ]);
		Prefs.add_callback("hide_global_ratings", hide_global_rating_callback);
	};

	var rating_user_callback = function(json) {
		// TODO: Show an error, maybe?  Is it handled by API.js...?
		if (!json.success) return;

		rating_update_song(json.song_id, null, json.rating_user);

		for (var i = 0; i < json.updated_album_ratings.length; i++) {
			if (json.updated_album_ratings[i]) {
				rating_update_album(json.updated_album_ratings[i].id, null, json.updated_album_ratings[i].rating_user, json.updated_album_ratings[i].rating_complete);
			}
		}
	};

	var rating_update_song = function(song_id, rating, rating_user) {
		var ratings = document.getElementsByName("srate_" + song_id);
		for (var i = 0; i < ratings.length; i++) {
			if (rating_user) {
				ratings[i].update_user_rating(rating_user);
			}
			if (rating) {
				ratings[i].update_rating(rating);
			}
		}
	};

	var rating_update_album = function(album_id, rating, rating_user, rating_complete) {
		var ratings = document.getElementsByName("arate_" + album_id);
		for (var i = 0; i < ratings.length; i++) {
			if (rating_user) {
				ratings[i].update_user_rating(rating_user);
			}
			if (rating) {
				ratings[i].update_rating(rating);
			}
			if (rating_complete || (rating_complete === false)) {
				ratings[i].update_rating_complete(rating_complete);
			}
		}
		if (self.album_rating_callback) {
			self.album_rating_callback(album_id, rating, rating_user, rating_complete);
		}
	};

	var rating_complete_toggle = function(use_complete) {
		if (use_complete) {
			document.body.classList.add("show_incomplete");
		}
		else {
			document.body.classList.remove("show_incomplete");
		}
	};

	var hide_global_rating_callback = function(hide_globals) {
		if (hide_globals) {
			document.body.classList.add("hide_global_ratings");
		}
		else {
			document.body.classList.remove("hide_global_ratings");
		}
	};

	var change_fave = function(el_name, json) {
		if (!json.success) return;

		var faves = document.getElementsByName(el_name);
		var i;
		if (json.fave) {
			for (i = 0; i < faves.length; i++) {
				faves.classList.add("fave");
			}
		}
		else {
			for (i = 0; i < faves.length; i++) {
				faves.classList.remove("fave");
			}
		}
	};

	var song_fave_update = function(json) {
		change_fave("srate_" + json.id, json);
	};

	var album_fave_update = function(json) {
		change_fave("arate_" + json.id, json);
	};

	return self;
}();