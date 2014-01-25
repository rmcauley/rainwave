var RatingControl = function() {
	"use strict";

	var song_ratings = {};
	var album_ratings = {};
	
	var self = {};
	self.album_rating_callback = null;
	self.padding_top = SmallScreen ? 1 : 3;

	self.initialize = function() {
		API.add_callback(self.rating_user_callback, "rate_result");
		API.add_callback(self.song_fave_update, "fave_song_result");
		API.add_callback(self.album_fave_update, "fave_album_result");
		API.add_callback(self.history_update, "sched_history");
		API.add_callback(function() { setTimeout(self.garbage_collection, 2000); }, "_SYNC_COMPLETE");
	};
	
	self.rating_user_callback = function(json) {
		// TODO: Show an error, maybe?  Is it handled by API.js...?
		if (!json.success) return;

		rating_update_song(json.song_id, json.rating_user, null);

		for (var i = 0; i < json.updated_album_ratings.length; i++) {
			rating_update_album(json.updated_album_ratings[i].id, null, json.updated_album_ratings[i].rating_user);
		}
	};

	var rating_update_song = function(song_id, rating, rating_user) {
		if (song_id in song_ratings) {
			for (var i = 0; i < song_ratings[song_id].length; i++) {
				if (rating_user) song_ratings[song_id][i].update_user_rating(rating_user);
				if (rating) song_ratings[song_id][i].update_user_rating(rating);
			}
		}
	};

	var rating_update_album = function(album_id, rating, rating_user) {
		if (album_id in album_ratings) {
			for (var i = 0; i < album_ratings[album_id].length; i++) {
				if (rating_user) album_ratings[album_id][i].update_user_rating(rating_user);
				if (rating) album_ratings[album_id][i].update_rating(rating);
			}
		}
		if (self.album_rating_callback) {
			self.album_rating_callback(album_id, rating, rating_user);
		}
	};
	
	self.garbage_collection = function() {
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
				song_ratings[json.id].update_fave(json.fave);
			}
		}
	};
	
	self.album_fave_update = function(json) {
		if (!json.success) return;
		if (json.id in album_ratings) {
			for (var i = 0; i < album_ratings[json.id].length; i++) {
				album_ratings[json.id].update_fave(json.fave);
			}
		}
	};
	
	self.history_update = function(json) {
		if (json.length > 0) {
			if (("songs" in json[0]) && (json[0].songs.length > 0)) {
				rating_update_album(json[0].songs[0].albums[0].id, null, json[0].songs[0].albums[0].rating);
				rating_update_song(json[0].songs[0].id, null, json[0].songs[0].rating);
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
	}

	return self;
}();
