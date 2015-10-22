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
		Prefs.define("allow_rate_anything", [ false, true ]);
		Prefs.define("allow_clear", [ false, true ]);
		Prefs.add_callback("allow_clear", function(v) {
			if (v) {
				document.body.classList.add("rating_clear_ok");
			}
			else {
				document.body.classList.remove("rating_clear_ok");
			}
		});
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
			else {
				ratings[i].classList.remove("rating_user");
				ratings[i].rating_start(0);
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
					else if (a.rating) {
						ratings[i].classList.remove("rating_user");
						ratings[i].rating_start(a.rating);
					}
					else {
						ratings[i].classList.remove("rating_user");
						ratings[i].rating_start(0);
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
		if ((typeof(evt.offsetX) != "undefined") && (typeof(evt.offsetY) != "undefined")) {
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

		if (x < 0 || y < 0) return 1;
		var result = Math.round(((x + ((18 - y) * 0.5)) / 10) * 2) / 2;
		if (result <= 1) return 1;
		else if (result >= 5) return 5;
		return result;
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

		if (User.id > 1) {
			var is_song = json.title || json.albums || json.album_id || json.album_rating || json.artist_parseable ? true : false;
			if (is_song) register_song(json, relative_x, relative_y);
			else register_album(json, relative_x, relative_y);

			if (json.rating_user) {
				json.$t.rating.classList.add("rating_user");
				if (json.$t.rating_clear) {
					json.$t.rating_clear.parentNode.classList.add("capable");
				}
			}
		}
		json.$t.rating.rating_set(json.rating_user || json.rating);

		// DO NOT RETURN ANYTHING HERE
		// You run an almost 100% certain risk of memory leaks due to
		// circular references if you return a function or object
		// that refers to or uses "json" in any way.
	};

	var register_song = function(json, relative_x, relative_y) {
		json.$t.rating.classList.add("rating_song");
		json.$t.rating.setAttribute("name", "srate_" + json.id);

		if (json.$t.rating_clear) {
			json.$t.rating_clear.addEventListener("click", function() {
				API.async_get("clear_rating", { "song_id": json.id },
					function(newjson) {
						json.rating_user = null;
						json.$t.rating_clear.parentNode.classList.remove("capable");
					}
				);
			});
		}

		var on_mouse_over = function(evt) {
			if (!json.rating_allowed && (!User.rate_anything || Prefs.get("allow_rate_anything"))) {
				if (json.$t.rating.classList.contains("ratable")) {
					json.$t.rating.classList.remove("ratable");
				}
				return;
			}
			if (!json.$t.rating.classList.contains("ratable")) {
				json.$t.rating.classList.add("ratable");
			}
			on_mouse_move(evt);
		};

		var on_mouse_move = function(evt) {
			if (!json.rating_allowed && !User.rate_anything) return;
			if (evt.target !== this) return;
			var tr = get_rating_from_mouse(evt, relative_x, relative_y);
			if (tr) {
				json.$t.rating.rating_set(tr);
				json.$t.rating_hover_number.textContent = Formatting.rating(tr);
			}
		};

		var on_mouse_out = function(evt) {
			this.rating_start(json.rating_user || json.rating);
		};

		var click = function(evt) {
			evt.stopPropagation();
			if (!json.rating_allowed && !User.rate_anything) return;
			if (evt.target !== this) return;
			var new_rating = get_rating_from_mouse(evt, relative_x, relative_y);
			if (json.rating_allowed || User.rate_anything) {
				API.async_get("rate", { "rating": new_rating, "song_id": json.id },
					function(newjson) {
						json.rating_user = newjson.rate_result.rating_user;
						if (json.$t.rating_clear) {
							json.$t.rating_clear.parentNode.classList.add("capable");
						}
					},
					function(newjson) {
						// TODO: error handling
					}
				);
			}
		};

		if (User.id > 1) {
			json.$t.rating._json = json;
			json.$t.rating.addEventListener("mouseover", on_mouse_over);
			json.$t.rating.addEventListener("mousemove", on_mouse_move);
			json.$t.rating.addEventListener("mouseleave", on_mouse_out);
			json.$t.rating.addEventListener("click", click);
		}
	};

	var register_album = function(json, relative_x, relative_y) {
		json.$t.rating.setAttribute("name", "arate_" + json.id);
		json.$t.rating.classList.add("album_rating");

		if (!json.rating_complete) {
			json.$t.rating.classList.add("rating_incomplete");
		}
		else {
			json.$t.rating.classList.remove("rating_incomplete");
		}
	};

	return self;
}();
