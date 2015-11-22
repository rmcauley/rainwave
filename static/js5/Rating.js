var Rating = function() {
	"use strict";
	var self = {};
	self.album_callback = null;
	var is_touching = false;
	var touch_timer;

	BOOTSTRAP.on_init.push(function(template) {
		API.add_callback("rate_result", rating_api_callback);

		Prefs.define("r_incmplt", [ false, true ], true);
		Prefs.add_callback("r_incmplt", rating_complete_toggle);
		Prefs.define("r_noglbl", [ false, true ], true);
		Prefs.add_callback("r_noglbl", hide_global_rating_callback);
		Prefs.define("r_clear", [ false, true ], true);
		Prefs.add_callback("r_clear", rating_clear_toggle);
		Prefs.define("r_noomni", [ false, true ], true);

		var clear_touch = function() {
			touch_timer = false;
			is_touching = false;
		};

		document.body.addEventListener("touchend", function () {
			if (touch_timer) {
				clearTimeout(touch_timer);
			}
			touch_timer = setTimeout(clear_touch, 30);
		});

		rating_complete_toggle(Prefs.get("r_incmplt"));
		hide_global_rating_callback(Prefs.get("r_noglbl"));
		rating_clear_toggle(Prefs.get("r_clear"));
	});

	// PREF CALLBACKS

	var rating_clear_toggle = function(v) {
		if (v) {
			document.body.classList.add("rating_clear_ok");
		}
		else {
			document.body.classList.remove("rating_clear_ok");
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
				if (ratings[i].firstChild) {
					ratings[i].firstChild.textContent = Formatting.rating(json.rating_user);
				}
			}
			else if (json.rating) {
				ratings[i].classList.remove("rating_user");
				ratings[i].rating_start(json.rating);
				if (ratings[i].firstChild) {
					ratings[i].firstChild.textContent = "";
				}
			}
			else {
				ratings[i].classList.remove("rating_user");
				ratings[i].rating_start(0);
				if (ratings[i].firstChild) {
					ratings[i].firstChild.textContent = "";
				}
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
						if (ratings[i].firstChild) {
							ratings[i].firstChild.textContent = Formatting.rating(a.rating_user);
						}
					}
					else if (a.rating) {
						ratings[i].classList.remove("rating_user");
						ratings[i].rating_start(a.rating);
						if (ratings[i].firstChild) {
							ratings[i].firstChild.textContent = "";
						}
					}
					else {
						ratings[i].classList.remove("rating_user");
						ratings[i].rating_start(0);
						if (ratings[i].firstChild) {
							ratings[i].firstChild.textContent = "";
						}
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
		// R4 bar image calculation
		// this.style.backgroundPosition = "0px " + (-(Math.round((Math.round(this.rating_now * 10) / 2)) * 30) + 3) + "px";
		// R5 images
		this.style.backgroundPosition = "0px " + (-(Math.round((Math.round(this.rating_now * 10) / 2)) * 28) + 3) + "px";
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
		var result = Math.round((((x - 4) + ((18 - y) * 0.5)) / 10) * 2) / 2;
		if (result <= 1) return 1;
		else if (result >= 5) return 5;
		return result;
	};

	var rating_width = 58;
	var slider_width = 200;
	var do_touch_rating = function(song, e) {
		var zero_x = song.$t.rating.offsetLeft + rating_width - slider_width - 10;
		var t = RWTemplates.rating_mobile();
		var remove = function(e) {
			if (e.target == song.$t.rating) {
				do_rating(now_number, song);
			}
			Fx.remove_element(t.el);
			song.$t.rating.removeEventListener("touchmove", touchmove);
			document.body.removeEventListener("touchend", remove);
			document.body.removeEventListener("touchcancel", remove);
		};
		var now_number = 5;
		var highlight = function(rating, width) {
			t.number.style[Fx.transform] = "translateX(" + (width - 15) + "px)";
			t.slider.style.backgroundPosition = "0px " + -(Math.max(5, Math.min(25, Math.floor(width / ((slider_width - 25) / 24)))) * 96) + "px";
			if (rating === now_number) return;
			now_number = rating;
			t.number.textContent = Formatting.rating(rating);
		};
		var touchmove = function(e) {
			var rating = (Math.floor((e.touches[0].pageX - (zero_x + 25)) / ((slider_width - 25) / 9)) / 2) + 1;
			rating = Math.min(Math.max(1, rating), 5);
			highlight(rating, Math.min(slider_width, Math.max(0, (e.touches[0].pageX - zero_x))));
		};
		document.body.addEventListener("touchend", remove);
		document.body.addEventListener("touchcancel", remove);
		song.$t.rating.addEventListener("touchmove", touchmove);
		song.$t.rating.appendChild(t.el);
		touchmove(e);
		requestAnimationFrame(function() {
			t.el.classList.add("show");
		});
	};

	var do_rating = function(new_rating, json) {
		var confirm = document.createElement("div");
		confirm.className = "rating_number rating_confirm";
		confirm.textContent = Formatting.rating(new_rating);
		confirm.style[Fx.transform] = "translateX(" + Math.round((new_rating / 5.0 * 50) - 15) + "px) scaleX(0.2)";
		json.$t.rating.insertBefore(confirm, json.$t.rating.firstChild);
		setTimeout(function() {
			confirm.classList.add("confirming");
		}, 20);
		API.async_get("rate", { "rating": new_rating, "song_id": json.id },
			function(newjson) {
				setTimeout(function() {
					confirm.classList.add("confirmed");
				}, 20);
				json.rating_user = newjson.rate_result.rating_user;
				if (json.$t.rating_clear) {
					json.$t.rating_clear.parentNode.classList.add("capable");
				}
				setTimeout(function() {
					confirm.style.opacity = "0";
					setTimeout(function() {
						confirm.parentNode.removeChild(confirm);
					}, 250);
				}, 1500);
			},
			function(newjson) {
				confirm.textContent = "!";
				confirm.classList.add("bad_rating");
				setTimeout(function() {
					confirm.style.opacity = "0";
					setTimeout(function() {
						confirm.parentNode.removeChild(confirm);
					}, 250);
				}, 1500);
			}
		);
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

		if (!Sizing.simple && json.rating_user) {
			json.$t.rating_hover_number.textContent = Formatting.rating(json.rating_user);
		}

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
			if (!json.rating_allowed && (!User.rate_anything || Prefs.get("r_noomni"))) {
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
			if (is_touching) return;
			if (!json.rating_allowed && !User.rate_anything) return;
			if (evt.target !== this) return;
			var new_rating = get_rating_from_mouse(evt, relative_x, relative_y);
			if (json.rating_allowed || User.rate_anything) {
				do_rating(new_rating, json);
			}
		};

		if (User.id > 1) {
			json.$t.rating._json = json;
			json.$t.rating.addEventListener("mouseover", on_mouse_over);
			json.$t.rating.addEventListener("mousemove", on_mouse_move);
			json.$t.rating.addEventListener("mouseleave", on_mouse_out);
			json.$t.rating.addEventListener("click", click);
			json.$t.rating.addEventListener("touchstart", function(e) {
				is_touching = true;
				do_touch_rating(json, e);
			});
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
