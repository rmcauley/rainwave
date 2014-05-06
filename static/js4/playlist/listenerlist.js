var ListenersList = function(offset_width, parent_el) {
	"use strict";
	var self = SearchList("current_listeners", "name", "name", parent_el);
	self.tab_el = $el("li", { "textContent": $l("Listeners"), "class": "link" });
	self.tab_el.addEventListener("click", function() {
		if (!self.loaded) {
			API.async_get("current_listeners");
		}
		PlaylistLists.change_visible_list(self); }
	);

	self.update_parent = self.update;
	self.update = function(json) {
		if (!json) return;
		self.update_parent(json.users);
	}

	API.add_callback(self.update, "current_listeners");

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
		DetailView.open_listener(id);
	};

	return self;
};