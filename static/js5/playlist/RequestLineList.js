var RequestLineList = function(el) {
	"use strict";
	var self = SearchList(el, "username", "username");
	self.$t.no_result_message.textContent = $l("nobody_in_line");
	self.auto_trim = true;
	self.loaded = true;

	API.add_callback("request_line", self.update);

	self.draw_entry = function(item) {
		item.id = item.user_id;
		item.name_searchable = Formatting.make_searchable_string(item.username);
		item._el = document.createElement("div");
		item._el.className = "item";
		item._el.textContent = item.username;
	};

	self.update_item_element = function(item) {
		// this has no need
	};

	self.open_id = function(id) {
		Router.change("listener", id);
	};

	return self;
};