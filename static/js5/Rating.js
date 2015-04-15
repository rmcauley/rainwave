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

	// INDIVIDUAL RATING FUNCTIONS

	var get_rating_from_mouse = function(evt) {
		var x, y;
		if (evt.offsetX && evt.offsetY) {
			x = evt.offsetX;
			y = evt.offsetY;
		}
		else {
			if (!this.offset_left && !this.absolute_x) this.offset_left = evt.target.offsetLeft;
			if (!this.offset_top && !this.absolute_y) this.offset_top = evt.target.offsetTop;
			x = evt.layerX || evt.x;
			y = evt.layerY || evt.y;
			if (!this.absolute_x) x -= this.offset_left;
			if (!this.absolute_y) y -= this.offset_top;
		}

		//console.log("layerX: " + (evt.layerX || evt.offsetX) + " / layerY: " + (evt.layerY || evt.offsetY) + "<br>offset_left: " + offset_left + " / offset_top:" + offset_top + "<br>x: " + x + " / y: " + y + " -> ");
		if (x <= 18) return 0;		// fave switching

		var result = Math.round(((x - 20 + ((18 - y) * 0.5)) / 10) * 2) / 2;
		//console.log(result);
		if (result <= 1) return 1;
		else if (result >= 5) return 5;
		return result;
	};

	var on_mouse_move = function(evt) {
		var tr = get_rating_from_mouse(evt);
		if (tr >= 1) {
			this.classList.add("user_rating");
			effect.set(tr);
			hover_number.textContent = Formatting.rating(tr);
			if (self.rating_user_number_element) {
				self.rating_user_number_element.textContent = Formatting.rating(tr);
			}
			else {
				hover_box.style.width = Math.max(tr * 10 - 3, 20) + "px";
				if (!hover_box.parentNode) {
					Fx.stop_chain(hover_box);
					self.el.insertBefore(hover_box, self.el.firstChild);
				}
				hover_box.style.opacity = "1";
			}
		}
		else {
			effect.set_rating(current_rating);
		}
	};

	var click = function(evt) {
		evt.stopPropagation();
		var new_rating = get_rating_from_mouse(evt);
		// fave toggle
		if (new_rating === 0) {
			// effect.set_fave(!self.fave);
			if (self.type == "song") {
				API.async_get("fave_song", { "fave": !self.fave, "song_id": id });
			}
			else if (self.type == "album") {
				API.async_get("fave_album", { "fave": !self.fave, "album_id": id });
			}
		}
		else if (self.ratable) {
			self.rate(new_rating);
		}
	};

	self.update_user_rating = function(rating_user) {
		self.rating_user = rating_user;
		self.reset_rating();
	};

	self.update_fave = function(fave) {
		self.fave = fave;
		self.reset_fave();
	};

	self.update_rating = function(rating) {
		self.rating = rating;
		self.reset_rating();
	};

	self.update_ratable = function(ratable) {
		self.ratable = ratable;
		if (self.ratable) $add_class(self.el, "ratable");
		else $remove_class(self.el, "ratable");
	};

	self.update_rating_complete = function(new_rating_complete, override) {
		if (self.type != "album") return;
		if (override || !("rating_complete" in self) || (self.rating_complete != new_rating_complete)) {
			self.rating_complete = new_rating_complete;
			if (self.rating_complete || !Prefs.get("playlist_show_rating_complete") || !self.rating_user) {
				self.el.style.backgroundImage = null;
			}
			else if (Prefs.get("playlist_show_rating_complete")) {
				self.el.style.backgroundImage = "url('/static/images4/rating_bar/unrated_ldpi.png')";
			}
		}
	};

	self.update = function(rating_user, rating, fave, ratable) {
		self.rating_user = rating_user;
		self.rating = rating;
		self.fave = fave;
		self.ratable = ratable;
		self.reset_rating();
		self.reset_fave();
	};

	self.register = function(json) {
		if (!json || !json.rating || isNaN(json.id)) {
			return;
		}
		if (json.rating_user && ((json.rating_user < 1) || (json.rating_user > 5))) {
			json.rating_user = null;
		}
		if (json.rating && ((json.rating < 1) || (json.rating > 5))) {
			json.rating = null;
		}

		this.effect = RatingEffect

		json.$template.rating_el.effect = RatingEffect(json.$template.rating_el);

		var rate = function() {
			if (!self.ratable) return;
			effect.set_rating(new_rating);
			API.async_get("rate", { "rating": new_rating, "song_id": id });
		};

		if (User.id > 1) {
			json.$template.rating_el._json = json;
			json.$template.fave_lined.classList.add("faveable");
			json.$template.rating_el.addEventListener("mousemove", on_mouse_move);
			json.$template.rating_el.addEventListener("click", rate);
		}
	};

	return self;
}();


var RatingEffect = function(el) {
	var self = {};


	self.set = function(pos) {
		now = pos;
		to = pos;
		if (!anim_id) {
			step(0);
		}
	};

	self.start = function(stopat) {
		if (to == stopat) return;
		started = performance.now();
		to = stopat;
		from = now;
		if (!anim_id) {
			step(started);
		}
	};

	var step = function(steptime) {
		if ((steptime < (started + duration)) && (now != to)) {
			var timeoverduration = (steptime - started) / duration;
			now = -(to - from) * timeoverduration * (timeoverduration - 2) + from;
			anim_id = requestAnimationFrame(step);
		}
		else {
			now = to;
			anim_id = null;
		}
		el.style.backgroundPosition = "18px " + (-(Math.round((Math.round(now * 10) / 2)) * 30)) + "px";
	};

	return self;
};