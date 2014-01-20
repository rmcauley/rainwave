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

		self.change_visible_list(lists.albums);

		var margin_top = tabs_el.offsetHeight + search_box.offsetHeight + 5;
		for (var list in lists) {
			lists[list].el.style.marginTop = margin_top + "px";
		}
		scroller.margin_top = margin_top - 3;

		API.add_callback(lists.albums.update, "all_albums");
		API.add_callback(lists.albums.update, "album_diff");
	};

	self.change_visible_list = function(change_to) {
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
		scroller.update_scroll_height(null, self.active_list.list_name);
		scroller.scroll_to(self.active_list._scroll_position);
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

	self.draw_entry = function(item) {
		var item_el = document.createElement("div", { "class": "searchlist_entry" });
		// item._rating = AlbumRating(item);
		// item_el.appendChild(item._rating.el);
		// item_el.appendChild($el("div", { "class": "searchlist_name", "textContent": item.name }));
		item_el.textContent = item.name;
		return item_el;
	};

	self.update_item_element = function(item) {
		if (item.rating_user) {
			item._el.style.backgroundImage = "url(/static/images4/rating_bar/bright_ldpi.png)";
			item._el.style.backgroundPosition = (offset_width - 50) + "px " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + 3) + "px";
		}
		else if (item.rating) {
			item._el.style.backgroundImage = "url(/static/images4/rating_bar/dark_ldpi.png)";
			item._el.style.backgroundPosition = (offset_width - 50) + "px " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + 3) + "px";	
		}
	};

	self.on_resize = function() {
		offset_width = self.el.offsetWidth;
		self.update_all_item_elements();
	};

	return self;
};