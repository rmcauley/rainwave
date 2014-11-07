var RatingControl = function() {
	"use strict";

	var song_ratings = {};
	var album_ratings = {};

	var self = {};
	self.album_rating_callback = null;
	self.fave_callback = null;
	self.padding_top = SmallScreen ? 1 : 3;
	var gc_timer = false;

	self.initialize = function() {
		API.add_callback(self.rating_user_callback, "rate_result");
		API.add_callback(self.song_fave_update, "fave_song_result");
		API.add_callback(self.album_fave_update, "fave_album_result");
		API.add_callback(self.history_update, "sched_history");
		API.add_callback(function() { gc_timer = setTimeout(self.garbage_collection, 10000); }, "_SYNC_COMPLETE");

		// was originally a playlist pref, now lives here
		Prefs.define("playlist_show_rating_complete", [ false, true ]);
		Prefs.add_callback("playlist_show_rating_complete", rating_complete_toggle);

		Prefs.define("hide_global_ratings", [ false, true ]);
		Prefs.add_callback("hide_global_ratings", hide_global_rating_callback);

		$id("rating_window_5_0").addEventListener("click", function() { do_modal_rating(5.0); });
		$id("rating_window_4_5").addEventListener("click", function() { do_modal_rating(4.5); });
		$id("rating_window_4_0").addEventListener("click", function() { do_modal_rating(4.0); });
		$id("rating_window_3_5").addEventListener("click", function() { do_modal_rating(3.5); });
		$id("rating_window_3_0").addEventListener("click", function() { do_modal_rating(3.0); });
		$id("rating_window_2_5").addEventListener("click", function() { do_modal_rating(2.5); });
		$id("rating_window_2_0").addEventListener("click", function() { do_modal_rating(2.0); });
		$id("rating_window_1_5").addEventListener("click", function() { do_modal_rating(1.5); });
		$id("rating_window_1_0").addEventListener("click", function() { do_modal_rating(1.0); });
	};

	self.rating_user_callback = function(json) {
		// TODO: Show an error, maybe?  Is it handled by API.js...?
		if (!json.success) return;

		rating_update_song(json.song_id, null, json.rating_user);

		for (var i = 0; i < json.updated_album_ratings.length; i++) {
			rating_update_album(json.updated_album_ratings[i].id, null, json.updated_album_ratings[i].rating_user, json.updated_album_ratings[i].rating_complete);
		}
	};

	var rating_update_song = function(song_id, rating, rating_user) {
		if (song_id in song_ratings) {
			for (var i = 0; i < song_ratings[song_id].length; i++) {
				if (rating_user) song_ratings[song_id][i].update_user_rating(rating_user);
				if (rating) song_ratings[song_id][i].update_rating(rating);
			}
		}
	};

	var rating_update_album = function(album_id, rating, rating_user, rating_complete) {
		if (album_id in album_ratings) {
			for (var i = 0; i < album_ratings[album_id].length; i++) {
				if (rating_user) album_ratings[album_id][i].update_user_rating(rating_user);
				if (rating) album_ratings[album_id][i].update_rating(rating);
				if (rating_complete || (rating_complete === false)) album_ratings[album_id][i].update_rating_complete(rating_complete);
			}
		}
		if (self.album_rating_callback) {
			self.album_rating_callback(album_id, rating, rating_user, rating_complete);
		}
	};

	var rating_complete_toggle = function() {
		var album_id, i;
		for (album_id in album_ratings) {
			for (i = 0; i < album_ratings[album_id].length; i++) {
				album_ratings[album_id][i].update_rating_complete(album_ratings[album_id][i].rating_complete, true);
			}
		}
	};

	var hide_global_rating_callback = function() {
		var song_id, i;
		for (song_id in song_ratings) {
			for (i = 0; i < song_ratings[song_id].length; i++) {
				song_ratings[song_id][i].reset_rating();
			}
		}

		rating_complete_toggle();
	};

	self.garbage_collection = function() {
		if (!gc_timer) return;
		gc_timer = false;
		var song_id, album_id, i;
		for (song_id in song_ratings) {
			for (i = song_ratings[song_id].length - 1; i >= 0; i--) {
				if (!document.getElementById(song_ratings[song_id][i].html_id)) {
					song_ratings[song_id].splice(i, 1);
				}
			}
		}

		for (album_id in album_ratings) {
			for (i = album_ratings[album_id].length - 1; i >= 0; i--) {
				if (!document.getElementById(album_ratings[album_id][i].html_id)) {
					album_ratings[album_id].splice(i, 1);
				}
			}
		}
	};

	self.song_fave_update = function(json) {
		if (!json.success) return;
		if (json.id in song_ratings) {
			for (var i = 0; i < song_ratings[json.id].length; i++) {
				song_ratings[json.id][i].update_fave(json.fave);
			}
		}
	};

	self.album_fave_update = function(json) {
		if (!json.success) return;
		if (json.id in album_ratings) {
			for (var i = 0; i < album_ratings[json.id].length; i++) {
				album_ratings[json.id][i].update_fave(json.fave);
			}
		}
		if (self.fave_callback) {
			self.fave_callback(json.id, json.fave);
		}
	};

	self.history_update = function(json) {
		if (json.length > 0) {
			if (("songs" in json[0]) && (json[0].songs.length > 0)) {
				rating_update_album(json[0].songs[0].albums[0].id, null, json[0].songs[0].albums[0].rating, null);
				rating_update_song(json[0].songs[0].id, json[0].songs[0].rating, null);
			}
		}
	};

	self.add = function(rating) {
		var collection = rating.type == "song" ? song_ratings : album_ratings;
		if (!(rating.id in collection)) collection[rating.id] = [];
		collection[rating.id].push(rating);
		rating.html_id = rating.type + "_rating_" + rating.id + "_" + collection[rating.id].length;
		rating.el.setAttribute("id", rating.html_id);
		return rating.html_id;
	};

	self.change_padding_top = function(new_padding_top) {
		self.padding_top = new_padding_top;
		var i, j;
		for (i in song_ratings) {
			for (j in song_ratings[i]) {
				song_ratings[i][j].reset_rating();
			}
		}
		for (i in album_ratings) {
			for (j in album_ratings[i]) {
				album_ratings[i][j].reset_rating();
			}
		}
	};

	var current_modal_song_id;
	self.start_modal_rating = function(song_id) {
		if ((song_id in song_ratings) && (song_ratings[song_id].length)) {	
			current_modal_song_id = song_id;
			Menu.show_modal($id("rating_window_container"));
		}
	};

	var do_modal_rating = function(rating) {
		if (current_modal_song_id && (current_modal_song_id in song_ratings) && (song_ratings[current_modal_song_id].length)) {	
			song_ratings[current_modal_song_id][0].rate(rating);
		}
		current_modal_song_id = null;
		Menu.remove_modal();
	};

	return self;
}();
