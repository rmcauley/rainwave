var DetailView = function() {
	"use strict";
	var self = {};
	var el;
	var open_views = [];
	var scroller;
	var visible_view;

	self.initialize = function() {
		el = $id("detail");
		scroller = Scrollbar.new(el);
		API.add_callback(draw_album, "album");
	};
	
	var create = function(type, id, render_function, json) {
		while (open_views.length > 30) {
			open_views.shift();
		}
		var n = { "el": $el("div"), "type": type, "id": id, "visible": false, "clocks": [] };
		open_views.push(n);
		render_function(n, json);
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
		if (visible_view) {
			el.removeChild(visible_view.el);
			visible_view.visible = false;
		}
		visible_view = view;
		view.visible = true;
		view.el.style.display = "block";
		el.appendChild(view.el);
		scroller.update_scroll_height();
		return view;
	};

	self.on_resize = function() {
		if (scroller) scroller.update_scroll_height();
	};

	var draw_album = function(json) {
		switch_to(create("album", json.id, AlbumView, json));
	};

	self.reopen_album = function(id) {
		var existing_view = exists("album", id);
		if (existing_view) {
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