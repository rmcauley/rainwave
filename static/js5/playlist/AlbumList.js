 var AlbumList = function(el) {
	"use strict";
	var self = SearchList(el);
	self.$t.list.classList.add("album_list_core");

	var loading = false;

	Prefs.define("p_sort", [ "az", "rt" ], true);
	Prefs.define("p_null1", [ false, true ], true);
	Prefs.define("p_favup", null, true);
	Prefs.define("p_avup", [ true, false ], true);
	Prefs.define("p_fav1", [ false, true ], true);

	var sort_unrated_first = Prefs.get("p_null1");
	var sort_faves_first = Prefs.get("p_favup");
	var sort_available_first = Prefs.get("p_avup");
	var prioritize_faves = Prefs.get("p_fav1");

	var prefs_update = function(unused_arg, unused_arg2, no_redraw) {
		sort_unrated_first = Prefs.get("p_null1");
		sort_faves_first = Prefs.get("p_favup");
		sort_available_first = Prefs.get("p_avup");
		prioritize_faves = Prefs.get("p_fav1");

		var nv = Prefs.get("p_sort");
		if ([ "az", "rt" ].indexOf(nv) == -1) {
			Prefs.change("sort", "az");
		}
		if (nv == "rt") self.sort_function = self.sort_by_rating_user;
		else self.sort_function = self.sort_by_alpha;

		if (!no_redraw && self.loaded && !loading) {
			self.update([]);
			self.redraw_current_position();
		}
	};
	Prefs.add_callback("p_null1", prefs_update);
	Prefs.add_callback("p_sort", prefs_update);
	Prefs.add_callback("p_favup", prefs_update);
	Prefs.add_callback("p_avup", prefs_update);
	Prefs.add_callback("p_fav1", prefs_update);
	Prefs.add_callback("r_incmplt", prefs_update);

	API.add_callback("all_albums", function(json) { loading = true; self.update(json); });
	API.add_callback("album_diff", function(json) { if (self.loaded) self.update(json); });

	self.load = function() {
		if (!self.loaded && !loading) {
			self.show_loading();
			loading = true;
			API.async_get("all_albums");
		}
	};

	var update_rating = function(json) {
		var album_id;
		for (var i = 0; i < json.length; i++) {
			album_id = json[i].id;
			if (album_id in self.data) {
				if ("rating" in json[i]) self.data[album_id].rating = json[i].rating;
				if ("rating_user" in json[i]) self.data[album_id].rating_user = json[i].rating_user;
				if (json[i].rating_complete !== null) self.data[album_id].rating_complete = json[i].rating_complete;
				self.update_item_element(self.data[album_id]);
			}
		}
	};
	Rating.album_callback = update_rating;

	var update_fave = function(json) {
		if (json.id in self.data) {
			self.data[json.id].fave = json.fave;
			self.update_item_element(self.data[json.id]);
		}
	};
	Fave.album_callback = update_fave;

	self.open_id = function(id) {
		Router.change("album", id);
	};

	var has_new_threshold;
	var has_newish_threshold;
	if (!Clock.now && BOOTSTRAP && BOOTSTRAP.api_info) {
	 	has_new_threshold = BOOTSTRAP.api_info.time;
	 	has_newish_threshold = BOOTSTRAP.api_info.time;
	}
	else if (Clock.now) {
		has_new_threshold = Clock.now;
		has_newish_threshold = Clock.now;
	}
	else {
		has_new_threshold = parseInt(new Date().getTime() / 1000);
		has_newish_threshold = parseInt(new Date().getTime() / 1000);
	}
	has_new_threshold -= (86400 * 14);
	has_newish_threshold -= (86400 * 30);

	self.draw_entry = function(item) {
		item._el = document.createElement("div");
		item._el.className = "item" + (item.newest_song_time > has_new_threshold ? " has_new" : (item.newest_song_time > has_newish_threshold ? " has_newish" : ""));
		item._el._id = item.id;

		// could do this using RWTemplates.fave but... speed.  want to inline here as much as possible.
		item._el_fave = document.createElement("div");
		item._el_fave.className = "fave";
		item._el.appendChild(item._el_fave);
		var fave_lined = document.createElement("img");
		fave_lined.className = "fave_lined";
		fave_lined.src = "/static/images4/heart_lined.png";
		item._el_fave.appendChild(fave_lined);
		var fave_solid = document.createElement("img");
		fave_solid.className = "fave_solid";
		fave_solid.src = "/static/images4/heart_solid_gold.png";
		item._el_fave.appendChild(fave_solid);
		item._el_fave._fave_id = item.id;
		item._el_fave.addEventListener("click", Fave.do_fave);

		var span = document.createElement("span");
		span.className = "name";
		span.textContent = item.name;
		item._el.appendChild(span);

		self.update_cool(item);
		self.update_item_element(item);
	};

	self.update_cool = function(item) {
		if (!item._el) return;
		if (item.cool && (item.cool_lowest > Clock.now)) {
			item._el.classList.add("cool");
		}
		else {
			item._el.classList.remove("cool");
		}
	};

	self.update_item_element = function(item) {
		if (!item._el) return;

		item._el.classList.remove("fave_clicked");
		if (item.fave) {
			item._el.classList.add("album_fave_highlight");
			item._el_fave.classList.add("is_fave");
		}
		else {
			item._el.classList.remove("album_fave_highlight");
			item._el_fave.classList.remove("is_fave");
		}

		if (item.rating_complete) {
			item._el.classList.remove("rating_incomplete");
		}
		else {
			item._el.classList.add("rating_incomplete");
		}

		if (item.rating_user) {
			item._el.classList.add("rating_user");
			// R4
			// item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + 6) + "px";
			// R5
			item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 28) + 6) + "px";
		}
		else {
			item._el.classList.remove("rating_user");
			// R4
			// item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round((item.rating || 0) * 10) / 2)) * 30) + 6) + "px";
			// R5
			if (Prefs.get("r_noglbl") || !item.rating) {
				item._el.style.backgroundPosition = "right 6px";
			}
			else {
				item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating * 10) / 2)) * 28) + 6) + "px";
			}
		}
	};

	self.sort_by_alpha = function(a, b) {
		if (prioritize_faves && sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}

		if (!prioritize_faves && sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (sort_unrated_first) {
			if (!self.data[a].rating_user && self.data[b].rating_user) return -1;
			if (self.data[a].rating_user && !self.data[b].rating_user) return 1;
		}

		if (self.data[a].name_searchable < self.data[b].name_searchable) return -1;
		else if (self.data[a].name_searchable > self.data[b].name_searchable) return 1;
		return 0;
	};

	self.sort_by_rating_user = function(a, b) {
		if (prioritize_faves && sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}

		if (!prioritize_faves && sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (sort_unrated_first) {
			if (!self.data[a].rating_user && self.data[b].rating_user) return -1;
			if (self.data[a].rating_user && !self.data[b].rating_user) return 1;
		}

		if (self.data[a].rating_user < self.data[b].rating_user) return 1;
		if (self.data[a].rating_user > self.data[b].rating_user) return -1;

		if (self.data[a].name_searchable < self.data[b].name_searchable) return -1;
		else if (self.data[a].name_searchable > self.data[b].name_searchable) return 1;
		return 0;
	};

	prefs_update(null, null, true);

	return self;
};
