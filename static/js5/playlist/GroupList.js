var GroupList = function(el) {
	"use strict";
	var self = SearchList(el);
	var loading = false;

	Prefs.define("p_allcats", [ false, true ], true);

	self.load = function() {
		if (!self.loaded && !loading) {
			self.show_loading();
			loading = true;
			API.async_get("all_groups", { "all": Prefs.get("p_allcats") });
		}
	};

	API.add_callback("all_groups", function(json) { loading = true; self.update(json); });

	self.onFinishRender = function() {
		loading = false;
	};

	self.draw_entry = function(item) {
		item._el = document.createElement("div");
		item._el.className = "item";
		item._el.textContent = item.name;
	};

	self.update_item_element = function(item) {
		// this has no need
	};

	self.open_id = function(id) {
		Router.change("group", id);
	};

	return self;
};
