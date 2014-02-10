var DetailView = function() {
	"use strict";
	var self = {};
	var el;
	var open_views = [];
	var scroller;
	var visible_view;

	self.initialize = function() {
		Prefs.define("request_made");
		el = $id("detail");
		if (!Prefs.get("request_made")) {
			$add_class(el, "songlist_request_hint");
			Prefs.add_callback("request_made", request_made_changed);
		}
		scroller = Scrollbar.new(el);
		API.add_callback(draw_album, "album");
		API.add_callback(album_diff_handler, "album_diff");
		DeepLinker.register_route("album", open_album_internal);
	};

	var request_made_changed = function(request_made) {
		if (request_made) {
			$remove_class(el, "songlist_request_hint");
		}
	}
	
	var create = function(type, id, render_function, json) {
		while (open_views.length > 30) {
			open_views.shift();
		}
		var n = { "el": $el("div"), "type": type, "id": id, "visible": false, "scroll_top": 0 };
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
			visible_view.scroll_top = scroller.scroll_top;
			el.removeChild(visible_view.el);
			visible_view.visible = false;
		}
		visible_view = view;
		view.visible = true;
		view.el.style.display = "block";
		el.appendChild(view.el);
		scroller.update_scroll_height();
		scroller.scroll_to(view.scroll_top);
		return view;
	};

	self.on_resize = function() {
		// if (scroller) scroller.update_scroll_height();
	};

	var draw_album = function(json) {
		switch_to(create("album", json.id, AlbumView, json));
	};

	var album_diff_handler = function(json) {
		for (var i = 0; i < json.length; i++) {
			self.reopen_album(json[i].id);
		}
	};

	self.reopen_album = function(id) {
		var existing_view = exists("album", id);
		if (existing_view) {
			open_views.splice(open_views.indexOf(existing_view), 1);
			if (existing_view.visible) {
				open_album_internal(id);
			}
		}
	};

	self.open_album = function(id) {
		DeepLinker.change_url("album", id);
	};
	
	var open_album_internal = function(id) {
		id = parseInt(id);
		var existing_view = exists("album", id);
		if (existing_view) {
			switch_to(existing_view);
			return existing_view;
		}
		API.async_get("album", { "id": id });
	};

	// TODO: clocks?

	return self;
}();