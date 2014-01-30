var PlaylistLists = function() {
	"use strict";
	var self = {};
	self.active_list = false;

	var el;
	var lists = {};
	var tabs_el;
	var search_cancel;
	var search_box;
	var scroller;

	self.initialize = function() {
		el = $id("lists");
		tabs_el = el.appendChild($el("ul", { "class": "lists_tabs" }));
		search_box = el.appendChild($el("div", { "class": "searchlist_searchbox" }));
		search_cancel = search_box.appendChild($el("img", { "src": "/static/images4/cancel_ldpi.png", "class": "searchlist_cancel", "alt": "X", "title": $l("clearfilter") }))
		search_cancel.addEventListener("click", function() { self.active_list.clear_search(); });
		scroller = PlaylistScrollbar(el);

		lists.albums = AlbumList(scroller, el.offsetWidth - 20);
		lists.albums._scroll_position = 0;
		tabs_el.appendChild(lists.albums.tab_el);
		el.appendChild(lists.albums.el);

		self.change_visible_list(lists.albums, true);

		var margin_top = tabs_el.offsetHeight + search_box.offsetHeight + 5;
		for (var list in lists) {
			lists[list].el.style.marginTop = margin_top + "px";
		}
		scroller.margin_top = margin_top - 3;

		API.add_callback(lists.albums.update, "all_albums");
		API.add_callback(lists.albums.update, "album_diff");
	};

	self.change_visible_list = function(change_to, skip_scrollbar_update) {
		if (self.active_list) {
			self.active_list.el.style.display = "none";
			self.active_list.tab_el.className = "";
			self.active_list._scroll_position = scroller.scroll_top;
			search_box.replaceChild(change_to.search_box_input, self.active_list.search_box_input);
		}
		else {
			search_box.insertBefore(change_to.search_box_input, search_cancel.nextSibling);
		}
		self.active_list = change_to;
		self.active_list.el.style.display = "block";
		self.active_list.tab_el.className = "list_tab_open";
		if (!skip_scrollbar_update) {
			scroller.update_scroll_height(null, self.active_list.list_name);
		}
		scroller.scroll_to(self.active_list._scroll_position);
	};

	self.on_resize = function() {
		if ("albums" in lists) {
			lists.albums.on_resize(el.offsetWidth - 20);
		}
	};

	return self;
}();

var PlaylistScrollbar = function(element) {
	"use strict";
	var self = Scrollbar.new(element);

	self.update_scroll_height = function(force_height, list_name) {
		if (list_name == PlaylistLists.active_list.list_name) {
			self.parent_update_scroll_height(force_height);
		}
	};

	self.update_handle_position = function(list_name) {
		if (list_name == PlaylistLists.active_list.list_name) {
			self.parent_update_handle_position();
		}
	};

	return self;
};

var AlbumList = function(scroller, offset_width) {
	"use strict";
	var self = SearchList("album_list", "id", "name", "name_searchable", scroller);
	self.tab_el = $el("li", { "textContent": $l("album_list") });
	self.tab_el.addEventListener("click", function() { PlaylistLists.change_visible_list(self); }, false);

	var update_rating = function(album_id, rating, rating_user) {
		if (album_id in self.data) {
			if (rating) self.data[album_id].rating = rating;
			if (rating_user) self.data[album_id].rating_user = rating_user;
			self.update_item_element(self.data[album_id]);
		}
	};
	RatingControl.album_rating_callback = update_rating;

	var open_element = function(e) {
		if ("_id" in e.target) {
			self.open_id(e.target._id);
		}
	};
	self.el.addEventListener("click", open_element);

	self.open_id = function(id) {
		DetailView.open_album(id);
	};

	self.draw_entry = function(item) {
		var item_el = document.createElement("div");
		item_el.appendChild($el("span", { "textContent": item.name }));
		return item_el;
	};

	self.update_item_element = function(item) {
		if (item.cool) {
			$add_class(item._el, "searchlist_cooldown");
		}
		else {
			$remove_class(item._el, "searchlist_cooldown");
		}
		if (item.rating_user) {
			item._el.style.backgroundImage = "url(/static/images4/rating_bar/bright_ldpi.png)";
			item._el.style.backgroundPosition = (offset_width - 50) + "px " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + RatingControl.padding_top) + "px";
		}
		else if (item.rating) {
			item._el.style.backgroundImage = "url(/static/images4/rating_bar/dark_ldpi.png)";
			item._el.style.backgroundPosition = (offset_width - 50) + "px " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + RatingControl.padding_top) + "px";	
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
		if (Prefs.playlist_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
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
		if (Prefs.playlisf_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (Prefs.playlist_sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
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
		if (Prefs.playlist_sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (Prefs.playlist_sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
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