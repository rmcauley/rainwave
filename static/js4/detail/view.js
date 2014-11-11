var DetailView = function() {
	"use strict";
	var self = {};
	var el;
	var open_views = [];
	var scrollblock;
	var scroller;
	var resizer;
	var visible_view;
	var internal_width = false;

	self.initialize = function() {
		Prefs.define("request_made");
		Prefs.define("detail_global_ratings", [ false, true ]);
		Prefs.add_callback("detail_global_ratings", close_all);
		el = $id("detail");
		scrollblock = $id("detail_scrollblock");
		if (!MOBILE) {
			API.add_callback(draw_album, "album");
			API.add_callback(album_diff_handler, "album_diff");
			API.add_callback(draw_artist, "artist");
			API.add_callback(draw_listener, "listener");
			API.add_callback(draw_group, "group");
			DeepLinker.register_route("album", open_album_internal);
			DeepLinker.register_route("artist", open_artist_internal);
			DeepLinker.register_route("group", open_group_internal);
			DeepLinker.register_route("listener", open_listener_internal);
		}
	};

	self.draw = function() {
		if (!Prefs.get("request_made")) {
			$add_class(el, "songlist_request_hint");
			Prefs.add_callback("request_made", request_made_changed);
		}
	};

	self.scroll_init = function() {
		scroller = Scrollbar.create(el, $id("detail_scrollbar"));
		scroller.unrelated_positioning = true;
		Fx.delay_draw(self.on_resize_draw);
		self.on_resize_calculate();
	};

	var request_made_changed = function(request_made) {
		if (request_made) {
			$remove_class(el, "songlist_request_hint");
		}
	};

	var close_all = function() {
		var a;
		while (open_views.length) {
			a = open_views.shift();
			if (a.el.parentNode) {
				a.el.parentNode.removeChild(a.el);
			}
		}
		visible_view = null;
	};
	
	var create = function(type, id, render_function, json) {
		if (internal_width === false) {
			self.on_resize_calculate();
			self.on_resize_draw();
			$add_class(el, "scrollable");
		}
		var a;
		while (open_views.length > 20) {
			a = open_views.shift();
			if (a.el.parentNode) {
				a.el.parentNode.removeChild(a.el);
			}
		}
		var n = { "el": $el("div", { "class": "detail_view detail_view_" + type }), "type": type, "id": id, "visible": false, "scroll_top": 0 };
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
			if (visible_view.el.parentNode == el) el.removeChild(visible_view.el);
			else visible_view.parentNode.el.removeChild(visible_view.el);
			visible_view.visible = false;
		}
		visible_view = view;
		view.visible = true;
		view.el.style.display = "block";
		el.appendChild(view.el);
		scroller.recalculate();
		scroller.scroll_to(view.scroll_top || 0);
		scroller.refresh();
		return view;
	};

	self.on_resize = function() {
		self.on_resize_calculate();
		self.on_resize_draw();
	};

	self.on_resize_calculate = function() {
		var tmp = scrollblock.offsetWidth;
		if (tmp && (tmp > 0)) internal_width = tmp;
	};
	
	self.on_resize_draw = function() {
		el.style.width = (internal_width + Scrollbar.get_scrollbar_width()) + "px";
	};

	var draw_album = function(json) {
		switch_to(create("album", json.id, AlbumView, json));
	};

	var draw_artist = function(json) {
		switch_to(create("artist", json.id, ArtistView, json));
	};

	var draw_group = function(json) {
		switch_to(create("group", json.id, GroupView, json));
	};

	var draw_listener = function(json) {
		switch_to(create("listener", json.id, ListenerView, json));
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

	self.open_artist = function(id) {
		DeepLinker.change_url("artist", id);
	};

	self.open_group = function(id) {
		DeepLinker.change_url("group", id);
	};

	self.open_listener = function(id) {
		DeepLinker.change_url("listener", id);
	};

	var open_album_internal = function(id) { 
		id = parseInt(id);
		PlaylistLists.set_new_open("all_albums", id);
		return open_internal("album", id);
	};

	var open_artist_internal = function(id) {
		id = parseInt(id);
		PlaylistLists.set_new_open("all_artists", id);
		return open_internal("artist", id);
	};

	var open_group_internal = function(id) {
		id = parseInt(id);
		PlaylistLists.set_new_open("all_groups", id);
		return open_internal("group", id);
	};

	var open_listener_internal = function(id) {
		id = parseInt(id);
		PlaylistLists.set_new_open("current_listeners", id);
		return open_internal("listener", id);
	};
	
	var open_internal = function(type, id) {
		id = parseInt(id);
		if (!id || isNaN(id)) {
			return false;
		}
		var existing_view = exists(type, id);
		if (existing_view) {
			switch_to(existing_view);
			return existing_view;
		}
		API.async_get(type, { "id": id });
		return true;
	};
	// TODO: clocks?

	return self;
}();