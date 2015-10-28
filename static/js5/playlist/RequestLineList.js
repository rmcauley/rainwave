var RequestLineList = function(el) {
	"use strict";
	var self = SearchList(el, "username", "username");
	self.$t.no_result_message.textContent = $l("nobody_in_line");
	self.auto_trim = true;
	self.loaded = true;

	API.add_callback("request_line", self.update);

	self.sort_function = function(a, b) {
		if (self.data[a].position < self.data[b].position) return -1;
		else if (self.data[a].position > self.data[b].position) return 1;
		return 0;
	};

	self.draw_entry = function(item) {
		item.id = item.user_id;
		item.name_searchable = Formatting.make_searchable_string(item.username);
		item._el = document.createElement("div");
		item._el.className = "item";
		self.update_item_element(item);
	};

	self.update_item_element = function(item) {
		item._el.textContent = item.position + ". " + item.username;
		if (item.skip) {
			item._el.classList.add("skip");
		}
		else {
			item._el.classList.remove("skip");
		}
	};

	self.open_id = function(id) {
		Router.change("listener", id);
	};

	return self;
};
