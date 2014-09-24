// Optimizaton notes:
// It would optimize a little to only perform rating_reset on mouseout when something has actually changed

// This module is a bit of a mess due to the reliance on the legacy Fx library.

//var rating_dbg = ErrorHandler.make_debug_div();

// ******* SEE fx.js FOR BACKGROUND POSITIONING AND FAVE SHOWING/HIDING

var Rating = function(type, id, rating_user, rating, fave, ratable, rating_title_el) {
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
		"el": $el("div", { "class": "rating " + type + "_rating" }),
		"absolute_x": false,
		"absolute_y": false,
		"rating_title_el": rating_title_el
	};

	var hover_box = $el("div", { "class": "rating_hover" });
	var hover_number = hover_box.appendChild($el("div", { "class": "rating_hover_number" }));
	var fave_solid = self.el.appendChild($el("img", { "class": "fave_solid", "src": "/static/images4/heart_solid.png"}));
	var fave_lined = self.el.appendChild($el("img", { "class": "fave_lined", "src": "/static/images4/heart_lined.png"}));
	var current_rating;
	var effect = Fx.legacy_effect(Fx.Rating, self.el, 400);
	var offset_left;
	var offset_top;

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
		self.update_ratable(self.ratable);
	};

	self.reset_fave = function(evt) {
		if (self.fave) {
			$add_class(self.el, "rating_fave");
			if (self.rating_title_el) $add_class(self.rating_title_el, "rating_title_el_fave");
		}
		else {
			$remove_class(self.el, "rating_fave");
			if (self.rating_title_el) $remove_class(self.rating_title_el, "rating_title_el_fave");
		}
		if (evt) $remove_class(self.el, "fave_hover");
	};

	var get_rating_from_mouse = function(evt) {
		var x, y;
		if (evt.offsetX && evt.offsetY) {
			x = evt.offsetX;
			y = evt.offsetY;
		}
		else {
			if (!offset_left && !self.absolute_x) offset_left = evt.target.offsetLeft;
			if (!offset_top && !self.absolute_y) offset_top = evt.target.offsetTop;
			x = evt.layerX || evt.x;
			y = evt.layerY || evt.y;
			if (!self.absolute_x) x -= offset_left;
			if (!self.absolute_y) y -= offset_top;
		}

		//rating_dbg.innerHTML = "layerX: " + (evt.layerX || evt.offsetX) + " / layerY: " + (evt.layerY || evt.offsetY) + "<br>offset_left: " + offset_left + " / offset_top:" + offset_top + "<br>x: " + x + " / y: " + y + " -> ";
		if (x <= 18) return 0;		// fave switching

		var result = Math.round(((x - 20 + ((18 - y) * .5)) / 10) * 2) / 2;
		//rating_dbg.innerHTML += result;
		if (result <= 1) return 1;
		else if (result >= 5) return 5;
		return result;
	};

	var on_mouse_move = function(evt) {
		if (!self.ratable && !User.rate_anything) return;

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

	self.update = function(rating_user, rating, fave, ratable) {
		self.rating_user = rating_user;
		self.rating = rating;
		self.fave = fave;
		self.ratable = ratable;
		self.reset_rating();
		self.reset_fave();
	};

	self.rate = function(new_rating) {
		if (!self.ratable) return;
		effect.set_rating(new_rating);
		API.async_get("rate", { "rating": new_rating, "song_id": id });
	};

	self.fave_mouse_over = function() {
		$add_class(self.el, "fave_hover");
	};

	self.show_hover = function() {
		self.el.insertBefore(self.el.firstChild, hover_box);
		hover_box.style.opacity = 1;
	};

	self.hide_hover = function() {
		Fx.remove_element(hover_box);
		 offset_left = null;
		 offset_top = null;
	};

	self.reset_rating();
	self.reset_fave();

	if (User.id > 1 && !MOBILE) {
		self.el.addEventListener("mouseover", self.fave_mouse_over);
		self.el.addEventListener("mouseout", self.reset_fave);
		self.el.addEventListener("click", click);
		$add_class(fave_solid, "faveable");

		if (type == "song") {
			self.el.addEventListener("mouseout", self.hide_hover);
			self.el.addEventListener("mousemove", on_mouse_move);
			self.el.addEventListener("mouseout", self.reset_rating);
		}
	}

	RatingControl.add(self);

	return self;
};

var SongRating = function(json, rating_title_el) {
	return Rating("song", json.id, json.rating_user, json.rating, json.fave, json.rating_allowed, rating_title_el);
};

var AlbumRating = function(json, rating_title_el) {
	return Rating("album", json.id, json.rating_user, json.rating, json.fave, false, rating_title_el);
};