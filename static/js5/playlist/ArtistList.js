var ArtistList = function(el) {
	"use strict";
	var self = SearchList(el, "name", "name_searchable");

	var loading = false;

	API.add_callback("all_artists", self.update);
	
	self.load = function() {
		if (!self.loaded && !loading) {
			loading = true;
			API.async_get("all_artists");
		}
	};

	self.draw_entry = function(item) {
		item._el = document.createElement("div");
		item._el.className = "item";
		item._el.textContent = item.name;
		item._el._id = item.id;
	};

	self.update_item_element = function(item) {
		// this has no need
	};

	self.open_id = function(id) {
		Router.change("artist", id);
	};

	return self;
};