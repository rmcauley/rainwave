var RequestLineList = function(el) {
	"use strict";
	var self = SearchList(el, "username", "username");
	self.auto_trim = true;
	self.loaded = true;

	API.add_callback("request_line", self.update);

	self.draw_entry = function(item) {
		item.name_searchable = Formatting.make_searchable_string(item.username);
		item._el = document.createElement("div");
		item._el.className = "item";
		item._el.textContent = item.name;
	};

	self.update_item_element = function(item) {
		// this has no need
	};

	self.open_id = function(id) {
		Router.change("listener", id);
	};

	return self;
};