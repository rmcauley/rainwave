'use strict';

var PlaylistLists = function() {
	var self = {};
	self.active_list = false;

	var el;
	var lists;
	var tabs_el;

	var change_visible_list = function(change_to) {
		if (self.active_list) {
			self.active_list.el.style.display = "none";
			self.active_list.tab_el.className = "";
		}
		self.active_list = change_to;
		self.active_list.el.style.display = "block";
		self.active_list.tab_el.className = "list_tab_open";
	};

	var list_template = function(name, id_key, sort_key, search_key) {
		var list = SearchList(id_key, sort_key, search_key);
		list.tab_el = tabs_el.appendChild($el("li", { "textContent": $l(name) }));
		list.tab_el.addEventListener("click", function() { change_visible_list(list); }, false);

		if (name == "album_list") {
			list.draw_entry = function(item) {
				var item_el = document.createElement("div");
				item._rating = AlbumRating(item);
				item_el.appendChild(item._rating.el);
				item_el.textContent = item.name;
				return item_el;
			};

			list.update_item_element = function(item) {
				// pass for now
			};
		}
		return list;
	};

	self.initialize = function() {
		el = $id("lists");
		tabs_el = el.appendChild($el("ul", { "class": "lists_tabs" }));

		lists = {
			"albums": list_template("album_list", "id", "name", "name_searchable")
		};

		API.add_callback(lists.albums.update, "all_albums");
		API.add_callback(lists.albums.update, "album_diff");
	};

	return self;
}();