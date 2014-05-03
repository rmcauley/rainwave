var AlbumList = function(scroller, offset_width) {
	"use strict";

	// Preferences handling

	var playlist_sort_faves_first = false;
	var playlist_sort_available_first = true;

	Prefs.define("playlist_sort_faves_first", [ false, true ]);
	Prefs.define("playlist_sort_available_first", [ true, false ]);
	Prefs.add_callback("playlist_sort_faves_first", function(nv) { playlist_sort_faves_first = nv; });
	Prefs.add_callback("playlist_sort_available_first", function(nv) { playlist_sort_available_first = nv; });

	// TODO: change sorting methods

	// Actual app logic

	var self = SearchList("all_albums", "id", "name", "name_searchable", scroller);
	self.tab_el = $el("li", { "textContent": $l("Albums"), "class": "link" });
	self.tab_el.addEventListener("click", function() { 
		if (!self.loaded) {
			API.async_get("all_albums");
		}
		PlaylistLists.change_visible_list(self); }
	);
	API.add_callback(self.update, "all_albums");
	API.add_callback(function(json) {
		if (self.loaded) self.update(json);
	}, "album_diff");

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

	var change_fave = function(evt) {
		if ("_fave_id" in evt.target) {
			API.async_get("fave_album", { "fave": !self.data[evt.target._fave_id].fave, "album_id": evt.target._fave_id });
		}
	};

	self.open_id = function(id) {
		DetailView.open_album(id);
	};

	self.draw_entry = function(item) {
		// careful not to use $el() in here - this function gets called thousands of times
		// and we do NOT need the slowdown
		item._el = document.createElement("div");

		item._el_cool = document.createElement("span");
		item._el_cool.className = "searchlist_cooldown_time";
		item._el.appendChild(item._el_cool);
		
		item._el_fave = document.createElement("span");
		item._el_fave.className = "searchlist_fave";
		// don't call it _id or the album-opener-clicker will pick it up! ;)
		//item._el_fave._fave_id = item.id;
		item._el_fave.addEventListener("click", change_fave);
		item._el_fave_img = document.createElement("img");
		item._el_fave_img.className = "searchlist_fave_solid";
		item._el_fave_img.src = "/static/images4/heart_solid.png";
		item._el_fave.appendChild(item._el_fave_img);
		item._el.appendChild(item._el_fave);

		var lined = document.createElement("img");
		lined.className = "searchlist_fave_lined";
		lined.src = "/static/images4/heart_lined.png";
		lined._fave_id = item.id;
		item._el_fave.appendChild(lined);

		item._el_text_span = document.createElement("span");
		item._el_text_span.className = "searchlist_name";
		item._el_text_span.textContent = item.name;
		item._el_text_span._id = item.id;
		// save a function call if we can with an if statement here
		if (item.cool && (item.cool_lowest > Clock.now)) self.update_cool(item);

		item._el.appendChild(item._el_text_span);
	};

	self.update_cool = function(item) {
		if (item.cool && (item.cool_lowest > Clock.now)) {
			item._el_cool.textContent = Formatting.cooldown_glance(item.cool_lowest - Clock.now);
		}
		else {
			item._el_cool.textContent = "";
		}
	};

	self.update_item_element = function(item) {
		if (item.cool) {
			$add_class(item._el, "searchlist_cooldown");
		}
		else {
			$remove_class(item._el, "searchlist_cooldown");
		}
		if (item.fave) {
			$add_class(item._el, "searchlist_fave_on");
		}
		else {
			$remove_class(item._el, "searchlist_fave_on");
		}
		if (item.rating_complete) { 
			$add_class(item._el, "searchlist_rating_complete");
		}
		else {
			$remove_class(item._el, "searchlist_rating_complete");
		}
		if (item.rating_user) {
			item._el.style.backgroundImage = "url(/static/images4/rating_bar/bright_ldpi.png)";
			item._el.style.backgroundPosition = (offset_width - 58) + "px " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + RatingControl.padding_top) + "px";
		}
		else if (item.rating) {
			item._el.style.backgroundImage = "url(/static/images4/rating_bar/dark_ldpi.png)";
			item._el.style.backgroundPosition = (offset_width - 58) + "px " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + RatingControl.padding_top) + "px";	
		}
	};

	self.on_resize = function(new_offset_width) {
		offset_width = new_offset_width;
		for (var i in self.data) {
			self.update_item_element(self.data[i]);
		}
	};

	// there's lots of copy-paste code in the following functions because these are critical-path, called thousands of times
	self.sort_by_available = function(a, b) {
		if (playlist_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (self.data[a].cool !== self.data[b].cool) {
			if (self.data[a].cool === false) return 1;
			else return 0;
		}

		if (self.data[a]._lower_case_sort_keyed < self.data[b]._lower_case_sort_keyed) return 1;
		else if (self.data[a]._lower_case_sort_keyed > self.data[b]._lower_case_sort_keyed) return -1;
		return 0;
	};

	self.sort_by_updated = function(a, b) {
		if (playlisf_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (playlist_sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return 1;
			else return 0;
		}
		
		if (self.data[a].updated < self.data[b].updated) return 1;
		if (self.data[a].updated > self.data[b].updated) return -1;

		if (self.data[a]._lower_case_sort_keyed < self.data[b]._lower_case_sort_keyed) return 1;
		else if (self.data[a]._lower_case_sort_keyed > self.data[b]._lower_case_sort_keyed) return -1;
		return 0;
	};

	self.sort_by_rating_user = function(a, b) {
		if (playlist_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (playlist_sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return 1;
			else return 0;
		}

		if (self.data[a].rating_user < self.data[b].rating_user) return 1;
		if (self.data[a].rating_user > self.data[b].rating_user) return -1;

		if (self.data[a]._lower_case_sort_keyed < self.data[b]._lower_case_sort_keyed) return 1;
		else if (self.data[a]._lower_case_sort_keyed > self.data[b]._lower_case_sort_keyed) return -1;
		return 0;
	};

	self.sort_function = self.sort_by_available;

	return self;
};
