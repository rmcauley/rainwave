var AlbumList = function(el) {
	"use strict";
	var template = RWTemplates.searchlist();
	el.appendChild(template._root);

	var self = SearchList(template.scrollable, template.search_box, template.stretcher, "name", "name_searchable");

	var loading = false;
	var sort_faves_first = Prefs.get("playlist_sort_faves_first");
	var sort_available_first = Prefs.get("playlist_sort_available_first");
	var show_rating_complete = Prefs.get("playlist_show_rating_complete");

	var prefs_update = function() {
		sort_faves_first = Prefs.get("playlist_sort_faves_first");
		sort_available_first = Prefs.get("playlist_sort_available_first");
		show_rating_complete = Prefs.get("playlist_show_rating_complete");

		var nv = Prefs.get("playlist_sort");
		if ([ "alpha", "rating_user" ].indexOf(nv) == -1) {
			Prefs.change("sort", "alpha");
		}
		if (nv == "alpha") self.sort_function = self.sort_by_alpha;
		if (nv == "rating_user") self.sort_function = self.sort_by_rating_user;

		self.update_view([]);
		self.redraw_current_position();
	};
	Prefs.add_callback("playlist_sort", prefs_update);
	Prefs.add_callback("playlist_sort_faves_first", prefs_update);
	Prefs.add_callback("playlist_sort_available_first", prefs_update);
	Prefs.add_callback("playlist_show_rating_complete", prefs_update);

	API.add_callback(self.update, "all_albums");
	API.add_callback(function(json) {
		if (self.loaded) self.update(json);
	}, "album_diff");

	self.load = function() {
		if (!self.loaded && !loading) {
			loading = true;
			API.async_get("all_albums");
		}
	};

	var update_rating = function(json) {
		var album_id;
		for (var i = 0; i < json.length; i++) {
			album_id = json[i].id;
			if (album_id in self.data) {
				if (json[i].rating) self.data[album_id].rating = json[i].rating;
				if (json[i].rating_user) self.data[album_id].rating_user = json[i].rating_user;
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
		//DetailView.open_album(id);
	};

	self.draw_entry = function(item) {
		item._el = document.createElement("div");
		item._el.className = "item";

		item._el_text_span = document.createElement("span");
		item._el_text_span.className = "name";
		item._el_text_span.textContent = item.name;
		item._el_text_span._id = item.id;

		self.update_cool(item);
		self.update_item_element(item);

		item._el.appendChild(item._el_text_span);
	};

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
			item._el.classList.add("cool");
		}
		else {
			item._el.classList.remove("cool");
		}
	};

	self.update_item_element = function(item) {
		if (item.fave) {
			item._el.classList.add("fave");
		}
		else {
			item._el.classList.remove("fave");
		}
		if (item.rating_user && (item.rating_user > 0)) {
			if (show_rating_complete && !item.rating_complete) {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/unrated_ldpi.png)";
			}
			else {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/bright_ldpi.png)";
			}
			item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + 1) + "px";
		}
		else if (item.rating) {
			if (show_rating_complete && !item.rating_complete) {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/unrated_ldpi.png)";
			}
			else {
				item._el.style.backgroundImage = "url(/static/images4/rating_bar/dark_ldpi.png)";
			}
			item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating * 10) / 2)) * 30) + 1) + "px";
		}
	};

	self.sort_by_alpha = function(a, b) {
		if (sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}

		if (self.data[a]._lower_case_sort_keyed < self.data[b]._lower_case_sort_keyed) return -1;
		else if (self.data[a]._lower_case_sort_keyed > self.data[b]._lower_case_sort_keyed) return 1;
		return 0;
	};

	self.sort_by_rating_user = function(a, b) {
		if (sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}

		if (self.data[a].rating_user < self.data[b].rating_user) return 1;
		if (self.data[a].rating_user > self.data[b].rating_user) return -1;

		if (self.data[a]._lower_case_sort_keyed < self.data[b]._lower_case_sort_keyed) return -1;
		else if (self.data[a]._lower_case_sort_keyed > self.data[b]._lower_case_sort_keyed) return 1;
		return 0;
	};

	return self;
};