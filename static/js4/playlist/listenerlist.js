var ListenersList = function() {
	"use strict";
	var self = SearchList($id("lists_listeners_items"), $id("lists_listeners_scrollbar"), $id("lists_listeners_stretcher"), "name", "name_searchable");
	var loading = false;
	self.auto_trim = true;
	self.list_name = "current_listeners";
	self.load_from_api = function() {
		if (!self.loaded && !loading) {
			loading = true;
			API.async_get("current_listeners");
		}
	}
	self.tab_el = $el("li", { "textContent": $l("Listeners"), "class": "link" });
	self.tab_el.addEventListener("click", function() {
		self.load_from_api();
		PlaylistLists.change_visible_list(self);
	});
	if (!MOBILE) API.add_callback(self.update, "current_listeners");

	self.draw_entry = function(item) {
		item.name_searchable = Formatting.make_searchable_string(item.name);
		item._el = document.createElement("div");
		item._el.className = "searchlist_item";
		item._el_text_span = document.createElement("span");
		item._el_text_span.className = "searchlist_name";
		item._el_text_span.textContent = item.name;
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