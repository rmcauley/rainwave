var AlbumList = function() {
	"use strict";

	var self = SearchList($id("lists_albums_items"), $id("lists_albums_scrollbar"), $id("lists_albums_stretcher"), "name", "name_searchable");
	var loading = false;

	// Preferences handling
	var playlist_sort_solver = function(nv) {
		if (PlaylistLists.sorting_methods.indexOf(nv) == -1) Prefs.change("playlist_sort", PlaylistLists.sorting_methods[0]);
		if (nv == "alpha") self.sort_function = self.sort_by_alpha;
		//if (nv == "updated") self.sort_function = self.sort_by_updated;
		if (nv == "rating_user") self.sort_function = self.sort_by_rating_user;
		if (nv == "cool") self.sort_function = self.sort_by_cool_time;
	}
	Prefs.add_callback("playlist_sort", function(nv) {
		playlist_sort_solver(nv);
		self.update_view([]);
		self.redraw_current_position();
	});

	var playlist_sort_faves_first = Prefs.get("playlist_sort_faves_first");
	var playlist_sort_available_first = Prefs.get("playlist_sort_available_first");
	var playlist_show_rating_complete = Prefs.get("playlist_show_rating_complete");
	Prefs.add_callback("playlist_sort_faves_first", function(nv) {
		playlist_sort_faves_first = nv;
		self.update_view([]);
		self.redraw_current_position();
	});
	Prefs.add_callback("playlist_sort_available_first", function(nv) {
		playlist_sort_available_first = nv;
		self.update_view([]);
		self.redraw_current_position();
	});
	Prefs.add_callback("playlist_show_rating_complete", function(nv) {
		playlist_show_rating_complete = nv;
		self.refresh_all_items();
	});

	// Actual app logic

	self.list_name = "all_albums";

	self.load_from_api = function() {
		if (!self.loaded && !loading) {
			loading = true;
			API.async_get("all_albums");
		}
	}
	
	self.tab_el = $id("lists_tab_album");
	self.tab_el.textContent = $l("Albums");
	self.tab_el.addEventListener("click", function() {
		if (!self.loaded) {
			self.load_from_api();
		}
		PlaylistLists.change_visible_list(self); }
	);

	if (!MOBILE) {
		API.add_callback(self.update, "all_albums");
		API.add_callback(function(json) {
			if (self.loaded) self.update(json);
		}, "album_diff");
	}

	var change_cooldown_visible = function(visible) {
		if (visible) $add_class(self.el, "searchlist_cooldown_visible");
		else $remove_class(self.el, "searchlist_cooldown_visible");
	};
	Prefs.add_callback("searchlist_show_cooldown");

	var update_rating = function(album_id, rating, rating_user, rating_complete) {
		if (album_id in self.data) {
			if (rating) self.data[album_id].rating = rating;
			if (rating_user) self.data[album_id].rating_user = rating_user;
			if (rating_complete !== null) self.data[album_id].rating_complete = rating_complete;
			self.update_item_element(self.data[album_id]);
		}
	};
	RatingControl.album_rating_callback = update_rating;

	var update_fave = function(album_id, fave) {
		if (album_id in self.data) {
			self.data[album_id].fave = fave;
			self.update_item_element(self.data[album_id]);
		}
	};
	RatingControl.fave_callback = update_fave;

	self.open_id = function(id) {
		DetailView.open_album(id);
	};

	self.draw_entry = function(item) {
		// careful not to use $el() in here - this function gets called thousands of times
		// and we do NOT need the slowdown
		item._el = document.createElement("div");
		item._el.className = "searchlist_item";

		// item._el_cool = document.createElement("span");
		// item._el_cool.className = "searchlist_cooldown_time";
		// item._el.appendChild(item._el_cool);

		item._el_text_span = document.createElement("span");
		item._el_text_span.className = "searchlist_name";
		item._el_text_span.textContent = item.name;
		item._el_text_span._id = item.id;

		// save a function call if we can with an if statement here
		if (item.cool && (item.cool_lowest > Clock.now)) self.update_cool(item);

		// this is duplicate functionality from update_item_element, again to try and streamline
		// a heavy process
		if (item.fave) item._el.className += " searchlist_fave_on";
		//if (playlist_show_rating_complete && item.rating_complete) item._el.className += " searchlist_rating_complete";
		if (item.rating_user && (item.rating_user > 0)) {
			if (playlist_show_rating_complete && !item.rating_complete) {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/unrated_ldpi.png)";
			}
			else {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/bright_ldpi.png)";
			}
			item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + RatingControl.padding_top + 1) + "px";
		}
		else if (item.rating) {
			if (playlist_show_rating_complete && !item.rating_complete) {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/unrated_ldpi.png)";
			}
			else {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/dark_ldpi.png)";
			}
			item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating * 10) / 2)) * 30) + RatingControl.padding_top + 1) + "px";
		}

		item._el.appendChild(item._el_text_span);
	};

	// favourites happen in here!
	self.open_element_check = function(e, id) {
		if ("enter_key" in e) return true;
		var x = e.offsetX || e.layerX || e.x || 0;
		if (x < 22) {
			API.async_get("fave_album", { "fave": !self.data[id].fave, "album_id": id });
			return false;
		}
		return true;
	};

	self.update_cool = function(item) {
		if (item.cool && (item.cool_lowest > Clock.now)) {
			// item._el_cool.textContent = Formatting.cooldown_glance(item.cool_lowest - Clock.now);
			$add_class(item._el, "searchlist_cooldown");
		}
		else {
			// item._el_cool.textContent = "";
			$remove_class(item._el, "searchlist_cooldown");
		}
	};

	self.update_item_element = function(item) {
		if (item.fave) {
			$add_class(item._el, "searchlist_fave_on");
		}
		else {
			$remove_class(item._el, "searchlist_fave_on");
		}
		// if (playlist_show_rating_complete && item.rating_complete) {
		// 	$add_class(item._el, "searchlist_rating_complete");
		// }
		// else {
		// 	$remove_class(item._el, "searchlist_rating_complete");
		// }
		if (item.rating_user && (item.rating_user > 0)) {
			if (playlist_show_rating_complete && !item.rating_complete) {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/unrated_ldpi.png)";
			}
			else {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/bright_ldpi.png)";
			}
			item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + RatingControl.padding_top + 1) + "px";
		}
		else if (item.rating) {
			if (playlist_show_rating_complete && !item.rating_complete) {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/unrated_ldpi.png)";
			}
			else {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/dark_ldpi.png)";
			}
			item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating * 10) / 2)) * 30) + RatingControl.padding_top + 1) + "px";
		}
	};

	// there's lots of copy-paste code in the following functions because these are critical-path, called thousands of times
	self.sort_by_alpha = function(a, b) {
		if (playlist_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (playlist_sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}

		if (self.data[a]._lower_case_sort_keyed < self.data[b]._lower_case_sort_keyed) return -1;
		else if (self.data[a]._lower_case_sort_keyed > self.data[b]._lower_case_sort_keyed) return 1;
		return 0;
	};

	self.sort_by_updated = function(a, b) {
		if (playlist_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (playlist_sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}

		if (self.data[a].updated < self.data[b].updated) return 1;
		if (self.data[a].updated > self.data[b].updated) return -1;

		if (self.data[a]._lower_case_sort_keyed < self.data[b]._lower_case_sort_keyed) return -1;
		else if (self.data[a]._lower_case_sort_keyed > self.data[b]._lower_case_sort_keyed) return 1;
		return 0;
	};

	self.sort_by_rating_user = function(a, b) {
		if (playlist_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (playlist_sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}

		if (self.data[a].rating_user < self.data[b].rating_user) return 1;
		if (self.data[a].rating_user > self.data[b].rating_user) return -1;

		if (self.data[a]._lower_case_sort_keyed < self.data[b]._lower_case_sort_keyed) return -1;
		else if (self.data[a]._lower_case_sort_keyed > self.data[b]._lower_case_sort_keyed) return 1;
		return 0;
	};

	self.sort_by_cool_time = function(a, b) {
		if (playlist_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (playlist_sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}
		else if (self.data[a].cool && self.data[b].cool) {
			if (self.data[a].cool_lowest < self.data[b].cool_lowest) return -1;
			if (self.data[a].cool_lowest > self.data[b].cool_lowest) return 1;
		}

		if (self.data[a]._lower_case_sort_keyed < self.data[b]._lower_case_sort_keyed) return -1;
		else if (self.data[a]._lower_case_sort_keyed > self.data[b]._lower_case_sort_keyed) return 1;
		return 0;
	};

	playlist_sort_solver(Prefs.get("playlist_sort"));

	return self;
};
