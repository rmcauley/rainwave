var PlaylistLists = function() {
	"use strict";
	var self = {};
	self.active_list = false;

	var el;
	var lists = {};
	var tabs_el;
	var search_cancel;
	var search_box;

	self.initialize = function() {
		Prefs.define("searchlist_show_cooldown");

		el = $id("lists_container");
		tabs_el = $id("lists_tabs");
		search_box = $id("searchlist_searchbox");
		search_cancel = $id("searchlist_cancel");
		search_cancel.addEventListener("click", function() { self.active_list.clear_search(); });

		lists.all_albums = AlbumList(el);
		lists.all_artists = ArtistList(el);
		//lists.current_listeners = ListenersList(el);
	};

	self.scroll_init = function() {
		var resizer = Scrollbar.new_resizer(el, lists.all_albums.el, $id("lists_resizer"));
		resizer.add_scrollable(lists.all_artists.el);
		// resizer.add_scrollable(lists.current_listeners.el)
	};

	self.draw = function() {		
		tabs_el.appendChild(lists.all_albums.tab_el);
		tabs_el.appendChild(lists.all_artists.tab_el);
		//tabs_el.appendChild(lists.current_listeners.tab_el);

		var cookie_list = docCookies.getItem("r4_active_list");
		if (cookie_list in lists) {
			self.change_visible_list(lists[cookie_list], true);
		}
	};

	self.change_visible_list = function(change_to) {
		if (self.active_list) {
			self.active_list.el.style.display = "none";
			self.active_list.tab_el.className = null;
			search_box.replaceChild(change_to.search_box_input, self.active_list.search_box_input);
		}
		else {
			search_box.insertBefore(change_to.search_box_input, search_cancel.nextSibling);
		}
		self.active_list = change_to;
		self.active_list.el.style.display = "block";
		self.active_list.tab_el.className = "list_tab_open";
		docCookies.setItem("r4_active_list", change_to.list_name, Infinity, "/", BOOTSTRAP.cookie_domain)
	};

	self.on_resize = function() {
		for (var key in lists) {
			lists[key].on_resize();
		}
	};

	self.set_new_open = function(list_name, id) {
		if (list_name in lists) {
			self.change_visible_list(lists[list_name]);
			lists[list_name].set_new_open(id);
		}
	};

	return self;
}();
