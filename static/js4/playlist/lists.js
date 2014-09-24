PlaylistLists = function() {
	"use strict";
	var self = {};
	self.active_list = false;

	var el;
	var lists = {};
	var tabs_el;
	var search_cancel;
	var search_box;
	var tabs_el_height = 83;

	self.sorting_methods = [ "alpha", "rating_user", "cool" ];

	self.scroll_init = function() {
		var resizer = Scrollbar.new_resizer($id("lists"), $id("lists_albums"), $id("lists_resizer"));
		resizer.add_scrollable($id("lists_artists"));
		resizer.add_scrollable($id("lists_groups"));
		resizer.add_scrollable($id("lists_listeners"));
		resizer.callback = DetailView.on_resize;
	};

	self.initialize = function() {
		Prefs.define("playlist_sort", self.sorting_methods);
		Prefs.define("playlist_sort_faves_first", [ false, true ]);
		Prefs.define("playlist_sort_available_first", [ true, false ]);
		Prefs.define("playlist_show_rating_complete", [ false, true ]);
		Prefs.define("searchlist_show_cooldown");
		Prefs.define("playlist_show_escape_icon", [ true, false ]);

		el = $id("lists_container");
		tabs_el = $id("lists_tabs");
		search_box = $id("searchlist_searchbox");
		search_cancel = $id("searchlist_cancel");
		search_cancel.addEventListener("click", function() { self.active_list.clear_search(); });

		lists.all_albums = AlbumList();
		lists.all_artists = ArtistList();
		lists.all_groups = GroupList();
		lists.current_listeners = ListenersList();
	};

	self.draw = function() {		
		tabs_el.appendChild(lists.all_albums.tab_el);
		tabs_el.appendChild(lists.all_artists.tab_el);
		tabs_el.appendChild(lists.all_groups.tab_el);
		tabs_el.appendChild(lists.current_listeners.tab_el);

		var cookie_list = docCookies.getItem("r4_active_list");
		if (cookie_list in lists) {
			self.change_visible_list(lists[cookie_list], true);
		}

		el.style.height = (MAIN_HEIGHT - tabs_el_height) + "px";

		check_playlist_show_escape_icon(Prefs.get("playlist_show_escape_icon"));
		Prefs.add_callback("playlist_show_escape_icon", check_playlist_show_escape_icon);
	};

	var check_playlist_show_escape_icon = function(nv) {
		if (nv) {
			$remove_class(search_box, "no_escape_button");
		}
		else {
			$add_class(search_box, "no_escape_button");	
		}
	};

	self.intro_mode_first_open = function() {
		if (!self.active_list) self.change_visible_list(lists.all_albums);
	}

	self.change_visible_list = function(change_to, do_not_hit_api) {
		if (self.active_list == change_to) {
			return;
		}
		if (self.active_list) {
			self.active_list.hotkey_mode_disable();
			self.active_list.el.parentNode.style.display = "none";
			$remove_class(self.active_list.tab_el, "list_tab_open");
			search_box.replaceChild(change_to.search_box_input, self.active_list.search_box_input);
		}
		else {
			search_box.appendChild(change_to.search_box_input);
		}
		self.active_list = change_to;
		self.active_list.el.parentNode.style.display = "block";
		$add_class(self.active_list.tab_el, "list_tab_open");
		if (!do_not_hit_api && !self.active_list.loaded) self.active_list.load_from_api();
		docCookies.setItem("r4_active_list", change_to.list_name, Infinity, "/", BOOTSTRAP.cookie_domain)
		self.active_list.do_searchbar_style();
		self.active_list.recalculate(true);
		self.active_list.reposition();
	};

	self.on_resize = function(skip_list_resizes) {
		el.style.height = (MAIN_HEIGHT - tabs_el_height) + "px";
		if (skip_list_resizes) return;
		for (var key in lists) {
			lists[key].on_resize((MAIN_HEIGHT - tabs_el_height));
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
