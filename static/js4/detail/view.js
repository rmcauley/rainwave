var DetailView = function() {
	"use strict";
	var self = {};
	var el;
	var open_views = [];
	var scroller;

	self.initialize = function() {
		el = $id("detail");
		scroller = Scrollbar.new(el);
		API.add_callback(draw_album, "album");
	};
	
	var create = function(type, id) {
		while (open_views.length > 30) {
			el.removeChild(open_views[0].el);
			open_views.shift();
		}
		var n = { "el": $el("div"), "type": type, "id": id, "visible": false, "clocks": [] };
		open_views.push(n);
		return n;
	};

	var exists = function(type, id) {
		for (var i = 0; i < open_views.length; i++) {
			if ((open_views[i].type === type) && (open_views[i].id === id)) {
				return open_views[i];
			}
		}
		return null;
	};

	var switch_to = function(view) {
		for (var i = 0; i < open_views.length; i++) {
			if ((open_views[i].type !== view.type) || (open_views[i].id !== view.id)) {
				open_views[i].el.style.display = "none";
				open_views[i].visible = false;
			}
		}
		view.visible = true;
		view.el.style.display = "block";
		scroller.update_scroll_height();
		return view;
	};

	self.on_resize = function() {
		if (scroller) scroller.update_scroll_height();
	};

	var draw_album = function(json) {
		var n = switch_to(create("album", json.id));
		el.appendChild(AlbumView(n, json));
	};

	self.reopen_album = function(id) {
		var existing_view = exists("album", id);
		if (existing_view) {
			open_views.removeChild(existing_view.el);
			open_views.shift(open_views.indexOf(existing_view));
			if (existing_view.visible) {
				self.open_album(id);
			}
		}
	}
	
	self.open_album = function(id) {
		var existing_view = exists("album", id);
		if (existing_view) {
			switch_to(existing_view);
			return existing_view;
		}
		API.async_get("album", { "id": id });
	};

	// TODO: clocks

	return self;
}();