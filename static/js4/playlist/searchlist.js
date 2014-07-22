// REQUIRED EXTERNAL DEFINITIONS FOR USING THIS OBJECT FACTORY:
//	draw_entry(item);				// return a new element (will be using display: block, you SHOULD make a div)
//  update_item_element(item);		// return nothing, just update text/etc in the element you created above
//  open_id(id);					// open what the user has selected

// OPTIONAL FUNCTIONS you can overwrite:
//	after_update(json, data, sorted_data);
//  sort_function(a, b);			// normal Javascript sort method - return -1, 0, or 1 (default just uses 'id')

var SearchList = function(el, scrollbar_handle, stretching_el, sort_key, search_key) {
	"use strict";
	var self = {};
	self.sort_key = sort_key;
	self.search_key = search_key || "id";
	self.auto_trim = false;
	self.el = el;
	self.search_box_input = $el("div", { "class": "searchlist_input", "textContent": $l("filter") });
	self.search_box_input.addEventListener("keypress", function(e) { e.preventDefault(); });
	var scrollbar = Scrollbar.new(stretching_el.parentNode, scrollbar_handle, 0);
	// see bottom of this object for event binding

	var data = {}
	self.data = data;			// keys() are the object IDs (e.g. data[album.id])
	self.loaded = false;
	
	var visible = [];			// list of IDs sorted by the sort_function (visible on screen)
	var hidden = [];			// list of IDs unsorted - currently hidden from view during a search

	var hotkey_mode_on = false;
	var search_string = "";
	var current_key_nav_id = false;
	var current_open_id = false;
	var item_height = SmallScreen ? 20 : 24;
	var num_items_to_display;

	var current_scroll_index = 0;
	var current_height;

	// LIST MANAGEMENT ***********************************************

	self.update = function(json) {
		var i;
		if (self.auto_trim) {
			for (i in data) {
				data[i]._delete = true;
			}
		}
		for (i in json) {
			self.update_item(json[i]);
		}
		self.update_view();
		hidden = [];

		if (self.update_cool) {
			for (i in data) {
				self.update_cool(data[i]);
			}
		}
		self.loaded = true;
	};

	self.update_item = function(json) {
		var i;
		json._delete = false;
		if (json.id in data) {
			for (i in json) {
				self.data[json.id][i] = json[i];
			}
			self.update_item_element(self.data[json.id]);
		}
		else {
			self.draw_entry(json);
			json._searchname = json[search_key];
			json._el._id = json.id
			json._lower_case_sort_keyed = json[sort_key].toLowerCase();
			data[json.id] = json;
		}
		self.queue_reinsert(json.id);
	};

	self.update_cool = null;

	self.queue_reinsert = function(id) {
		var io = visible.indexOf(id);
		if (io >= 0) {
			visible.splice(io, 1);
		}
		if (hidden.indexOf(id) == -1) {
			hidden.push(id);
		}
	};

	var hotkey_mode_enable = function() {
		hotkey_mode_on = true;
		$add_class(self.search_box_input, "hotkey_mode");
		self.search_box_input.textContent = $l("hotkey_mode");
	};

	var hotkey_mode_disable = function() {
		hotkey_mode_on = false;
		$remove_class(self.search_box_input, "hotkey_mode");
		self.search_box_input.textContent = $l("filter");
	};

	var hotkey_mode_handle = function(character) {
		try {
			if ((parseInt(character) >= 1) && (parseInt(character) <= 5)) {
				Schedule.rate_current_song(parseInt(character));
			}
			else if (character == "a") Schedule.vote(0, 0);
			else if (character == "s") Schedule.vote(0, 1);
			else if (character == "d") Schedule.vote(0, 2);
			else if (character == "q") Schedule.vote(1, 0); 
			else if (character == "w") Schedule.vote(1, 1);
			else if (character == "e") Schedule.vote(1, 2);
			else { 
				hotkey_mode_disable();
				return false;
			}
			hotkey_mode_disable();
			return true;
		}
		catch (err) {
			if ("is_rw" in err) {
				hotkey_mode_error(err.tl_key);
				return true;
			}
			else {
				throw(err);
			}
		}
	};

	var hotkey_mode_error = function(tl_key) {
		hotkey_mode_disable();
		$add_class(self.search_box_input, "hotkey_mode_error");
		self.search_box_input.textContent = $l(tl_key);
		setTimeout(function() { 
			$remove_class(self.search_box_input, "hotkey_mode_error");
			self.search_box_input.textContent = $l("filter");
			}, 6000);
	};

	self.update_view = function(to_reshow) {
		to_reshow = to_reshow || hidden;

		// wait for searching to be over before re-arranging the list on the user
		if (search_string.length > 0) return;

		// Sort the reinsert pile for efficiency when re-inserting
		to_reshow.sort(self.sort_function);

		if (visible.length == 0) {
			visible = to_reshow;
		}
		else {
			// First we walk ONCE through the visible list, re-inserting entries as necessary
			// into the visible pile where necessary.  This ensures we're o(n) on the insertion.
			var next_reinsert_id = to_reshow.shift();
			for (var i = 0; i < visible.length; i++) {
				if (data[visible[i]]._delete) {
					delete(data[visible[i]]);
					visible.splice(i, 1);
				}
				else if (next_reinsert_id && (self.sort_function(visible[i], next_reinsert_id) == -1)) {
					visible.splice(i + 1, 0, next_reinsert_id);
					next_reinsert_id = to_reshow.shift();
				}
			}
			if (next_reinsert_id) visible.push(next_reinsert_id);
			if (to_reshow.length > 0) visible = visible.concat(to_reshow);
		}

		current_scroll_index = false;
		self.recalculate();
		self.reposition();
	};

	self.recalculate = function() {
		var full_height = item_height * visible.length;
		if (full_height != current_height) {
			stretching_el.style.height = full_height + "px";
			scrollbar.recalculate();
		}
		num_items_to_display = Math.ceil(scrollbar.offset_height / item_height) + 1;
	};

	self.sort_function = function(a, b) {
		if (data[a]._lower_case_sort_keyed < data[b]._lower_case_sort_keyed) return 1;
		else if (data[a]._lower_case_sort_keyed > data[b]._lower_case_sort_keyed) return -1;
		return 0;
	};

	self.open_element_check = function(e, id) { return true; };
	self.open_element = function(e) {
		if ("_id" in e.target && self.open_element_check(e, e.target._id)) {
			if (search_string != "") scroll_to_open_item_on_clear = true;
			self.open_id(e.target._id);
		}
	};
	self.el.addEventListener("click", self.open_element);

	// SEARCHING ****************************

	self.remove_key_nav_highlight = function() {
		if (current_key_nav_id) {
			$remove_class(data[current_key_nav_id]._el, "searchtable_key_nav_hover");
			current_key_nav_id = null;
		}
	};

	self.key_nav_highlight = function(id) {
		current_key_nav_id = id;
		$add_class(data[current_key_nav_id]._el, "searchtable_key_nav_hover");
		self.scroll_to_id(id);
	};

	self.key_nav_first_item = function() {
		self.remove_key_nav_highlight();
		self.key_nav_highlight(visible[0]);
	};

	self.key_nav_last_item = function() {
		self.remove_key_nav_highlight();
		self.key_nav_highlight(visible[visible.length - 1]);
	};

	var key_nav_arrow_action = function(jump) {
		if (!current_key_nav_id) {
			self.key_nav_first_item();
			return;
		}
		var current_idx = visible.indexOf(current_key_nav_id);
		if (!current_idx && (current_idx !== 0)) {
			self.key_nav_first_item();
			return;
		}
		var new_index = Math.max(0, Math.min(current_idx + jump, visible.length - 1));
		self.remove_key_nav_highlight();
		self.key_nav_highlight(visible[new_index]);
		return true;
	};
	
	self.key_nav_down = function() {
		return key_nav_arrow_action(1);
	};

	self.key_nav_up = function() {
		return key_nav_arrow_action(-1);
	};

	self.key_nav_page_down = function() {
		return key_nav_arrow_action(15);
	};

	self.key_nav_page_up = function() {
		return key_nav_arrow_action(-15);
	};

	self.key_nav_enter = function() {
		if (current_key_nav_id) {
			self.open_element({ "target": data[current_key_nav_id]._el, "enter_key": true });
			return true;
		}
		return false;
	};

	self.key_nav_escape = function() {
		self.clear_search();
	};

	self.key_nav_backspace = function() {
		if (search_string.length == 1) {
			self.clear_search();
			return true;
		}
		else if (search_string.length > 1) {
			search_string = search_string.substring(0, search_string.length - 1);
			self.search_box_input.textContent = search_string;
		
			var use_search_string = Formatting.make_searchable_string(search_string);
			var revisible = [];
			for (var i = hidden.length - 1; i >= 0; i--) {
				if (data[hidden[i]]._searchname.indexOf(use_search_string) > -1) {
					revisible.push(hidden.splice(i, 1)[0]);
				}
			}
			self.update_view(revisible);
			if (visible.indexOf(current_key_nav_id)) {
				self.scroll_to_id(current_key_nav_id);
			}
			else {
				if (visible.indexOf(current_open_id)) {
					self.scroll_to_id(current_open_id);
				}
				self.scroll_to_pixel(0);
			}
			return true;
		}
		return false;
	};

	self.key_nav_add_character = function(character) {
		if (hotkey_mode_on) {
			if (hotkey_mode_handle(character)) {
				return true;
			}
		}
		else if ((search_string.length == 0) && (character == " ")) {
			hotkey_mode_enable();
			return true;
		}
		search_string = search_string + character;
		self.search_box_input.textContent = search_string;
		$add_class(self.search_box_input.parentNode, "searchlist_input_active");
		var use_search_string = Formatting.make_searchable_string(search_string);
		for (var i = visible.length - 1; i >= 0; i--) {
			if (data[visible[i]]._searchname.indexOf(use_search_string) == -1) {
				hidden.push(visible.splice(i, 1)[0]);
			}
		}
		if (!visible.indexOf(current_key_nav_id)) {
			self.remove_key_nav_highlight();
		}
	};

	self.clear_search = function() {
		hotkey_mode_disable();
		search_string = "";
		$remove_class(self.search_box_input.parentNode, "searchlist_input_active");
		self.remove_key_nav_highlight();
		self.update_view();
	};

	// SCROLL **************************

	self.scroll_to_id = function(data_id) {
		if (data_id in data) self.scroll_to(data[data_id]);
	};

	self.scroll_to_key_nav = function() {
		if (current_key_nav_element) self.scroll_to(data[current_key_nav_id]);
	};

	self.scroll_to = function(data_item) {
		if (data_item) {
			var new_index = visible.indexOf(data_item.id);
			if ((new_index > (current_scroll_index + 5)) && (new_index < (current_scroll_index + num_items_to_display - 6))) {
				// nothing necessary
			}
			else if (new_index >= (current_scroll_index + num_items_to_display - 6)) {
				stretching_el.parentNode.scrollTop = Math.min(scrollbar.scroll_top_max, (new_index - num_items_to_display + 6) * item_height);
			}
			else {
				stretching_el.parentNode.scrollTop = Math.max(0, (new_index - 6) * item_height);
			}
		}
	};

	self.reposition = function() {
		var new_index = Math.floor(scrollbar.scroll_top / item_height);
		new_index = Math.max(0, Math.min(new_index, visible.length - num_items_to_display));
		
		var new_margin = (scrollbar.scroll_top - (item_height * new_index));
		new_margin = new_margin ? -new_margin : 0;	
		self.el.style.marginTop = new_margin + "px";
		self.el.style.top = scrollbar.scroll_top + "px";
		
		if (current_scroll_index === new_index) {
			return;
		}

		if (current_scroll_index) {
			if (new_index < current_scroll_index - num_items_to_display) current_scroll_index = false;
			else if (new_index > current_scroll_index + (num_items_to_display * 2)) current_scroll_index = false;
		}

		var i;
		// full reset
		if (current_scroll_index === false) {
			while (self.el.firstChild) {
	    		self.el.removeChild(self.el.lastChild);
			}
			for (i = new_index; (i < (new_index + num_items_to_display)) && (i < visible.length); i++) {
				self.el.appendChild(data[visible[i]]._el);
			}
		}
		// scrolling up
		else if (new_index < current_scroll_index) {
			for (i = current_scroll_index; i >= new_index; i--) {
				self.el.insertBefore(data[visible[i]]._el, self.el.firstChild);
			}
			while (self.el.childNodes.length > num_items_to_display) {
				self.el.removeChild(self.el.lastChild);
			}
		}
		// scrolling down (or starting fresh)
		else if (new_index > current_scroll_index) {
			for (i = (current_scroll_index + num_items_to_display); ((i < (new_index + num_items_to_display)) && (i < visible.length)) ; i++) {
				self.el.appendChild(data[visible[i]]._el);
			}
			while (self.el.childNodes.length > Math.min(visible.length - new_index, num_items_to_display)) {
				self.el.removeChild(self.el.firstChild);
			}
		}
		current_scroll_index = new_index;
	};

	// NAV *****************************

	self.nav_to_id = function(id) {
		if (id in data) {
			self.nav_to(data[id]);
			return true;
		}
		return false;
	};

	self.nav_to = function(data_item) {
		self.remove_key_nav_highlight();
		self.key_nav_highlight(data_item.id);
		self.scroll_to(data_item);
	};

	self.set_new_open = function(id) {
		if (!id in data) return;
		if (current_open_id) {
			$remove_class(data[current_open_id]._el, "searchlist_open_item");
		}
		$add_class(data[id]._el, "searchlist_open_item");
		current_open_id = id;
		self.key_nav_highlight(id);
		self.scroll_to_id(id);
	}

	// FAKING A TEXT FIELD **************

	var input_click = function(e) {
		if (search_string == "") {
			self.search_box_input.textContent = "";
			window.addEventListener("click", input_blur, true);
		}
	}

	var input_blur = function(e) {
		if (self.search_box_input.textContent == "") {
			self.search_box_input.textContent = $l("filter");
		}
		window.removeEventListener("click", input_blur, true);
	}

	self.search_box_input.addEventListener("click", input_click);

	self.on_resize = function() {
		if (SmallScreen) item_height = 20;
		else item_height = 24;
	};

	stretching_el.parentNode.addEventListener("scroll", self.reposition);

	return self;
};
