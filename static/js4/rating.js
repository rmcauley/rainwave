// Optimizaton notes:
// It would optimize a little to only perform rating_reset on mouseout when something has actually changed

// This module is a bit of a mess due to the reliance on the legacy Fx library.

//var rating_dbg = ErrorHandler.make_debug_div();

// ******* SEE fx.js FOR BACKGROUND POSITIONING AND FAVE SHOWING/HIDING

var Rating = function(type, id, rating_user, rating, fave, ratable) {
	"use strict";
	if ((type != "song") && (type != "album")) return undefined;
	if (isNaN(id)) return undefined;
	if (rating_user && ((rating_user < 1) || (rating_user > 5))) rating_user = null;
	if (rating && ((rating < 1) || (rating > 5))) rating = null;
	if (type != "song") ratable = false;

	var self = {
		"type": type,
		"id": id,
		"rating_user": rating_user,
		"rating": rating,
		"fave": fave,
		"ratable": ratable,
		"el": $el("div")
	};

	var hover_box = $el("div", { "class": "rating_hover" });
	var hover_number = hover_box.appendChild($el("div", { "class": "rating_hover_number" }));
	var fave_solid = self.el.appendChild($el("img", { "class": "fave_solid", "src": "/static/images4/heart_solid.png"}));
	var fave_lined = self.el.appendChild($el("img", { "class": "fave_lined", "src": "/static/images4/heart_lined.png"}));
	var current_rating;
	var effect = Fx.legacy_effect(Fx.Rating, self.el, 400);

	self.reset_rating = function() {
		if (self.rating_user) {
			effect.change_to_user_rating();
			current_rating = self.rating_user;
		}
		else {
			effect.change_to_site_rating();
			current_rating = self.rating;
		}
		effect.set_rating(current_rating);
	};

	self.reset_fave = function() {
		effect.set_fave(self.fave);
	};

	var get_rating_from_mouse = function(evt) {
		var x = 0;
		var y = 0;
		if (evt.offsetX) { x = evt.offsetX;	y = evt.offsetY; }
		else if (evt.layerX) { x = evt.layerX; y = evt.layerY; }

		// rating_dbg.textContent = x + " -> " + (Math.round(((x - 15) / 10) * 2) / 2);

		if (x <= 18) return 0;		// fave switching
		else if ((x > 18) && (x <= 24)) return 1;
		else if (x >= 68) return 5;
		return Math.round(((x - 15) / 10) * 2) / 2;
	};

	var on_mouse_move = function(evt) {
		if (!self.ratable && !User.radio_rate_anything) return;
		var tr = get_rating_from_mouse(evt);
		if (tr >= 1) {
			effect.change_to_user_rating();
			effect.set(tr);
			if (tr * 10 % 10 == 0) hover_number.textContent = tr + ".0";
			else hover_number.textContent = tr;
			hover_box.style.width = Math.max(tr * 10 - 3, 20) + "px";
			if (!hover_box.parentNode) {
				Fx.stop_chain(hover_box);
				self.el.insertBefore(hover_box, self.el.firstChild);
				hover_box.style.opacity = "1";
			}
		}
		else {
			effect.set_rating(current_rating);
		}
	};

	var click = function(evt) {
		if (!self.ratable) return;
		var new_rating = get_rating_from_mouse(evt);
		// fave toggle
		if (new_rating === 0) {
			effect.set_fave(!self.fave);
			if (self.type == "song") {
				API.async_get("fave_song", { "fave": !self.fave, "song_id": id });
			}
			else if (self.type == "album") {
				API.async_get("fave_album", { "fave": !self.fave, "album_id": id });
			}
		}
		else {
			effect.set_rating(new_rating);
			API.async_get("rate", { "rating": new_rating, "song_id": id });
		}
	};

	self.update_user_rating = function(rating_user) {
		self.rating_user = rating_user;
		self.reset_rating();
	};

	self.update_fave = function(fave) {
		self.fave = fave;
		effect.set_fave(self.fave);
	};

	self.update_rating = function(rating) {
		self.rating = rating;
		self.reset_rating();
	};

	self.update_ratable = function(ratable) {
		self.ratable = ratable;
	};

	self.update = function(rating_user, rating, fave, ratable) {
		self.rating_user = rating_user;
		self.rating = rating;
		self.fave = fave;
		self.ratable = ratable;
		self.reset_rating();
		self.reset_fave();
	};

	self.show_hover = function() {
		self.el.insertBefore(self.el.firstChild, hover_box);
		hover_box.style.opacity = 1;
	};

	self.hide_hover = function() {
		Fx.remove_element(hover_box);
	};

	self.reset_rating();
	self.reset_fave();

	if (User.user_id > 1) {
		fave_solid.addEventListener("mouseover", effect.fave_mouse_over, false);
		fave_solid.addEventListener("mouseout", self.reset_fave, false);

		if (type == "song") {
			fave_solid.addEventListener("mouseout", self.hide_hover);
			fave_solid.addEventListener("mousemove", on_mouse_move, false);
			fave_solid.addEventListener("mouseout", self.reset_rating, false);
			fave_solid.addEventListener("click", click, false);	
		}
	}

	// TODO: rating control
	// RatingControl.add(self)

	return self;
};

var SongRating = function(json) {
	return Rating("song", json.id, json.rating_user, json.rating, json.fave, json.rating_allowed);
};

var AlbumRating = function(json) {
	return Rating("album", json.id, json.rating_user, json.rating, json.fave, false);
};