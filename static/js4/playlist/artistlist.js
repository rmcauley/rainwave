var ArtistList = function(offset_width, parent_el) {
	"use strict";
	var self = SearchList("all_artists", "name", "name_searchable", parent_el);
	self.tab_el = $el("li", { "textContent": $l("Artists"), "class": "link" });
	self.tab_el.addEventListener("click", function() {
		if (!self.loaded) {
			API.async_get("all_artists");
		}
		PlaylistLists.change_visible_list(self); }
	);
	API.add_callback(self.update, "all_artists");

	self.draw_entry = function(item) {
		item._el = document.createElement("div");
		item._el_text_span = $el("span", { "class": "searchlist_name", "textContent": item.name });
		item._el_text_span._id = item.id;
		item._el.appendChild(item._el_text_span);
	};

	self.update_item_element = function(item) {
		// this has no need
	};

	self.open_id = function(id) {
		DetailView.open_artist(id);
	};

	return self;
};