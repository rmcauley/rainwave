var Rating = function() {
	"use strict";
	var self = {};
	self.album_callback = null;

	BOOTSTRAP.on_init.push(function(template) {
		API.add_callback("rate_result", rating_api_callback);

		// was originally a playlist pref, now lives here
		Prefs.define("playlist_show_rating_complete", [ false, true ]);
		Prefs.add_callback("playlist_show_rating_complete", rating_complete_toggle);

		Prefs.define("hide_global_ratings", [ false, true ]);
		Prefs.add_callback("hide_global_ratings", hide_global_rating_callback);
	});

	// PREF CALLBACKS

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

	// API CALLBACKS

	var rating_api_callback = function(json) {
		// Errors are handled in the individual rating functions, not globally here.
		if (!json.success) return;

		var ratings, i, a;

		ratings = document.getElementsByName("srate_" + json.song_id);
		for (i = 0; i < ratings.length; i++) {
			if (json.rating_user) {
				ratings[i].classList.add("rating_user");
				ratings[i].rating_start(json.rating_user);
			}
			else if (json.rating) {
				ratings[i].classList.remove("rating_user");
				ratings[i].rating_start(json.rating);
			}
		}

		for (i = 0; i < json.updated_album_ratings.length; i++) {
			if (json.updated_album_ratings[i]) {
				a = json.updated_album_ratings[i];
				ratings = document.getElementsByName("arate_" + a.id);
				for (i = 0; i < ratings.length; i++) {
					if (a.rating_user) {
						ratings[i].classList.add("rating_user");
						ratings[i].rating_start(a.rating_user);
					}
					if (a.rating) {
						ratings[i].classList.remove("rating_user");
						ratings[i].rating_start(a.rating);
					}
					if (a.rating_complete === false) {
						ratings[i].classList.add("rating_incomplete");
					}
					else {
						ratings[i].classList.remove("rating_incomplete");
					}
				}
				if (self.album_callback) {
					self.album_callback(json.updated_album_ratings);
				}
			}
		}
	};

	// RATING EFFECTS

	var add_effect = function(el) {
		el.rating_to = 0;
		el.rating_from = 0;
		el.rating_now = 0;
		el.rating_started = 0;
		el.rating_anim_id = null;
		// I have tested this and found it to not cause any memory leaks!
		// I still feel dirty though.
		el.rating_set = rating_set.bind(el);
		el.rating_start = rating_start.bind(el);
		el.rating_step = rating_step.bind(el);
	};

	var rating_set = function(pos) {
		this.rating_now = pos;
		this.rating_to = pos;
		if (!this.rating_anim_id) {
			this.rating_step(this.rating_started);
		}
	};

	var rating_start = function(stopat) {
		if (this.rating_to == stopat) return;
		this.rating_started = performance.now();
		this.rating_to = stopat;
		this.rating_from = this.rating_now;
		if (!this.rating_anim_id) {
			this.rating_step(this.rating_started);
		}
	};

	var rating_step = function(steptime) {
		if ((steptime < (this.rating_started + 300)) && (this.rating_now != this.rating_to)) {
			var timeoverduration = (steptime - this.rating_started) / 300;
			this.rating_now = -(this.rating_to - this.rating_from) * timeoverduration * (timeoverduration - 2) + this.rating_from;
			this.rating_anim_id = requestAnimationFrame(this.rating_step);
		}
		else {
			this.rating_now = this.rating_to;
			this.rating_anim_id = null;
		}
		this.style.backgroundPosition = "0px " + (-(Math.round((Math.round(this.rating_now * 10) / 2)) * 30) + 3) + "px";
	};

	var get_rating_from_mouse = function(evt, relative_x, relative_y) {
		var x, y;
		if (evt.offsetX && evt.offsetY) {
			x = evt.offsetX;
			y = evt.offsetY;
		}
		else {
			if (!evt.target.offset_left && !relative_x) {
				evt.target.offset_left = evt.target.offsetLeft;
			}
			if (!evt.target.offset_top && !relative_y) {
				evt.target.offset_top = evt.target.offsetTop;
			}
			x = evt.layerX || evt.x;
			y = evt.layerY || evt.y;
			if (!relative_x) x -= evt.target.offset_left;
			if (!relative_y) y -= evt.target.offset_top;
		}

		var result = Math.round(((x + ((18 - y) * 0.5)) / 10) * 2) / 2;
		if (result <= 1) return 1;
		else if (result >= 5) return 5;
		return result;
	};

	var on_mouse_over = function() {
		this.classList.add("rating_user");
	};

	// INDIVIDUAL RATING BAR CODE

	self.register = function(json, relative_x, relative_y) {
		if (!json || !json.$t.rating || !json.id || isNaN(json.id)) {
			return;
		}
		if (json.rating_user && ((json.rating_user < 1) || (json.rating_user > 5))) {
			json.rating_user = null;
		}
		if (json.rating && ((json.rating < 1) || (json.rating > 5))) {
			json.rating = null;
		}

		add_effect(json.$t.rating);

		var is_song = json.albums || json.album_id || json.album_rating ? true : false;

		if (is_song) {
			json.$t.rating.classList.add("rating_song");
		}

		var on_mouse_move = function(evt) {
			if (evt.target != json.$t.rating) return;
			var tr = get_rating_from_mouse(evt, relative_x, relative_y);
			json.$t.rating.rating_set(tr);
			if (tr) {
				json.$t.rating_hover_number.textContent = Formatting.rating(tr);
			}
		};

		var on_mouse_out = function(evt) {
			if (!is_song && !json.rating_complete) {
				this.classList.add("rating_incomplete");
			}
			else if (!is_song) {
				this.classList.remove("rating_incomplete");
			}
			if (!json.rating_user) {
				this.classList.remove("rating_user");
			}
			this.rating_start(json.rating_user || json.rating);
		};

		var click = function(evt) {
			evt.stopPropagation();
			var new_rating = get_rating_from_mouse(evt, relative_x, relative_y);
			if (json.rating_allowed || User.rate_anything) {
				API.async_get("rate", { "rating": new_rating, "song_id": json.id },
					function(newjson) {
						json.rating_user = newjson.rating_user;
					},
					function(newjson) {
						// TODO: error handling
					}
				);
			}
		};

		if (!is_song && !json.rating_complete) {
		json.$t.rating.classList.add("rating_incomplete");
		}
		else if (!is_song) {
			json.$t.rating.classList.remove("rating_incomplete");
		}
		if (json.rating_user) {
			json.$t.rating.classList.add("rating_user");
		}
		json.$t.rating.rating_set(json.rating_user || json.rating);

		if (User.id > 1) {
			json.$t.rating._json = json;
			if (is_song) {
				json.$t.rating.addEventListener("mouseover", on_mouse_over);
				json.$t.rating.addEventListener("mousemove", on_mouse_move);
				json.$t.rating.addEventListener("mouseleave", on_mouse_out);
			}
			json.$t.rating.addEventListener("click", click);
		}

		// DO NOT RETURN ANYTHING HERE
		// You run an almost 100% certain risk of memory leaks due to
		// circular references if you return a function or object
		// that refers to or uses "json" in any way.
	};

	return self;
}();