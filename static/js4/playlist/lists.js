var PlaylistLists = function() {
	"use strict";
	var self = {};
	self.active_list = false;

	var el;
	var lists = {};
	var tabs_el;
	var search_cancel;
	var search_box;
	var margin_top;

	self.initialize = function() {
		Prefs.define("searchlist_show_cooldown");

		tabs_el = $id("lists_tabs");
		search_box = $id("searchlist_input").appendChild($el("div", { "class": "searchlist_searchbox" }));
		search_cancel = search_box.appendChild($el("img", { "src": "/static/images4/cancel_ldpi.png", "class": "searchlist_cancel", "alt": "X", "title": $l("clearfilter") }))
		search_cancel.addEventListener("click", function() { self.active_list.clear_search(); });
		
		el = $id("lists_container");

		var ow = 20;
		lists.all_albums = AlbumList(ow - 20, el);
		lists.all_albums._scroll_position = 0;
		tabs_el.appendChild(lists.all_albums.tab_el);

		lists.all_artists = ArtistList(ow - 20, el);
		lists.all_artists._scroll_position = 0;
		tabs_el.appendChild(lists.all_artists.tab_el);

		lists.current_listeners = ListenersList(ow - 20, el);
		lists.current_listeners._scroll_position = 0;
		tabs_el.appendChild(lists.current_listeners.tab_el);

		var cookie_list = docCookies.getItem("r4_active_list");
		if (cookie_list in lists) {
			self.change_visible_list(lists[cookie_list], true);
		}

		margin_top = $measure_el($id("lists_tabs")).height + $measure_el($id("lists_searchbox")).height
	};

	self.change_visible_list = function(change_to, skip_scrollbar_update) {
		if (self.active_list) {
			self.active_list.el.style.display = "none";
			self.active_list.tab_el.className = "";
			search_box.replaceChild(change_to.search_box_input, self.active_list.search_box_input);
		}
		else {
			search_box.insertBefore(change_to.search_box_input, search_cancel.nextSibling);
		}
		self.active_list = change_to;
		self.active_list.el.style.display = "block";
		self.active_list.tab_el.className = "list_tab_open";
		if (!skip_scrollbar_update) {
			self.active_list.scrollbar.update_scroll_height();
		}
		docCookies.setItem("r4_active_list", change_to.list_name, Infinity, "/", BOOTSTRAP.cookie_domain)
	};

	self.on_resize = function(new_height) {
		if (el) {
			el.style.height = new_height - margin_top + "px";
			for (var key in lists) {
				lists[key].on_resize();
			}
		}
	};

	self.on_scroll_resize = function() {
		if ("albums" in lists) {
			lists.albums.on_resize(el.offsetWidth - 20);
		}
	};

	self.set_new_open = function(list_name, id) {
		if (list_name in lists) {
			lists[list_name].set_new_open(id);
		}
	};

	return self;
}();
