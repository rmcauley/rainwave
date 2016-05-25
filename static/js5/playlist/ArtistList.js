var ArtistList = function(el) {
	"use strict";
	var self = SearchList(el);

	var loading = false;

	API.add_callback("all_artists", function(json) { loading = true; self.update(json); });

	self.load = function() {
		if (!self.loaded && !loading) {
			self.show_loading();
			loading = true;
			API.async_get("all_artists");
		}
	};

	self.onFinishRender = function() {
		loading = false;
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
