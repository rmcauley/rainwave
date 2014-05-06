// REQUIRED EXTERNAL DEFINITIONS FOR USING THIS OBJECT FACTORY:
//	draw_entry(item);				// return a new element (will be using display: block, you SHOULD make a div)
//  update_item_element(item);		// return nothing, just update text/etc in the element you created above
//  open_id(id);					// open what the user has selected

// OPTIONAL FUNCTIONS you can overwrite:
//	after_update(json, data, sorted_data);
//  sort_function(a, b);			// normal Javascript sort method - return -1, 0, or 1 (default just uses 'id')

var SearchList = function(list_name, sort_key, search_key, parent_el) {
	"use strict";
	var self = {};
	self.list_name = list_name;
	self.sort_key = sort_key;
	self.search_key = search_key || "id";
	self.auto_trim = false;
	self.after_update = null;
	self.el = $el("div", { "class": "searchlist" });
	self.scrollbar = Scrollbar.new(self.el);
	var scrollbar = self.scrollbar;
	self.search_box_input = $el("div", { "class": "searchlist_input", "textContent": $l("filter") });
	self.search_box_input.addEventListener("keypress", function(e) { e.preventDefault(); });
	// see bottom of this object for event binding

	var data = {};				// raw data
	self.data = data;
	self.loaded = false;
	var sorted = [];			// list of IDs sorted by the sort_function (always maintained, contains all IDs)
	var reinsert = [];			// list of IDs unsorted - will be resorted in the list when the user is not in a search
	var hidden = [];			// list of IDs unsorted - currently hidden from view during a search
	var hotkey_mode_on = false;

	var search_string = "";
	var current_key_nav_element = false;
	var current_open_element = false;
	var scroll_offset = 140;

	// LIST MANAGEMENT ***********************************************

	self.update = function(json) {
		self.loaded = true;
		var i;
		if (self.auto_trim) {
			for (i in data) {
				data[i]._delete = true;
			}
		}
		for (i in json) {
			self.update_item(json[i]);
		}
		if (self.after_update) self.after_update(json, data, sorted);
		self.update_view();
		if (self.update_cool) {
			for (i in data) {
				self.update_cool(data[i]);
			}
		}
		if (!self.el.parentNode) {
			parent_el.appendChild(self.el);
		}
	};

	self.update_item = function(json) {
		var i;
		json._delete = false;
		if (json.id in data) {
			for (i in json) {
				self.data[json.id[i]] = json[i];
			}
			self.update_item_element(self.data[json.id]);
		}
		else {
			self.draw_entry(json);
			json._searchname = json[search_key];
			json._el._id = json.id
			json._el._hidden = false;
			json._lower_case_sort_keyed = json[sort_key].toLowerCase();
			data[json.id] = json;
		}
		self.queue_reinsert(json.id);
	};

	self.update_cool = null;

	self.update_all_item_elements = function() {
		for (var i in data) {
			self.update_item_element(data[i]);
		}
	};

	self.queue_reinsert = function(id) {
		var io = sorted.indexOf(id);
		if (io >= 0) {
			sorted.splice(io, 1);
		}
		if (reinsert.indexOf(id) == -1) {
			reinsert.push(id);
		}
	};

	self.reflow_container = function() {
		sorted.sort(self.sort_function);
		for (var i = 0; i < sorted.length; i++) {
			self.el.appendChild(data[sorted[i]]._el);
		}
		scrollbar.update_scroll_height(null, list_name);
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

	self.update_view = function() {
		// wait for searching to be over before re-arranging the list on the user
		if (search_string.length > 0) return;

		// Sort the reinsert pile for efficiency when re-inserting
		reinsert.sort(self.sort_function);

		// First we walk ONCE through the sorted list, re-inserting entries as necessary
		// into the sorted pile where necessary.  This ensures we're o(n).
		// Could be better than o(n) though, will have to scratch my head on this
		var next_reinsert_id = reinsert.pop();
		for (var i = sorted.length - 1; i >= 0; i--) {
			if (data[sorted[i]]._delete) {
				self.el.removeChild(data[sorted[i]]._el);
				delete(data[sorted[i]]);
				sorted.splice(i, 1);
			}
			else if (next_reinsert_id && (self.sort_function(next_reinsert_id, sorted[i]) == -1)) {
				self.el.insertBefore(data[next_reinsert_id]._el, data[sorted[i]]._el.nextSibling);
				sorted.splice(i - 1, 0, next_reinsert_id);
				next_reinsert_id = reinsert.pop();
			}
		}
		// finish adding any leftovers at the bottom of the pile
		while (next_reinsert_id) {
			sorted.push(next_reinsert_id);
			self.el.appendChild(data[next_reinsert_id]._el);
			next_reinsert_id = reinsert.pop();
		}
		scrollbar.update_scroll_height(null, list_name);
	};

	self.sort_function = function(a, b) {
		if (data[a]._lower_case_sort_keyed < data[b]._lower_case_sort_keyed) return 1;
		else if (data[a]._lower_case_sort_keyed > data[b]._lower_case_sort_keyed) return -1;
		return 0;
	};

	self.open_element_check = function(e, id) { return true; };
	self.open_element = function(e) {
		if ("_id" in e.target && self.open_element_check(e, e.target._id)) {
			self.open_id(e.target._id);
		}
	};
	self.el.addEventListener("click", self.open_element);

	// SEARCHING ****************************

	self.remove_key_nav_highlight = function() {
		if (current_key_nav_element) {
			$remove_class(current_key_nav_element, "searchtable_key_nav_hover");
			current_key_nav_element = false;
		}
	};

	self.key_nav_highlight = function() {
		$add_class(current_key_nav_element, "searchtable_key_nav_hover");
	};

	self.key_nav_first_item = function() {
		current_key_nav_element = self.el.firstChild.nextSibling;
		if (!current_key_nav_element) {
			return false;
		}
		// find the next non-hidden child (if the firstChild isn't)
		while (current_key_nav_element._hidden && current_key_nav_element.nextSibling) { 
			current_key_nav_element = current_key_nav_element.nextSibling;
		}
	};

	self.key_nav_last_item = function() {
		current_key_nav_element = self.el.lastChild;
		if (!current_key_nav_element) {
			return false;
		}
		// find the next non-hidden child (if the firstChild isn't)
		while (current_key_nav_element._hidden && current_key_nav_element.previousSibling) { 
			current_key_nav_element = current_key_nav_element.previousSibling;
		}
	};

	var key_nav_arrow_action = function(up, down, jump) {
		if (!current_key_nav_element) {
			self.key_nav_first_item();
		}
		else {
			var current_jump = 0;
			var sibling = down ? "nextSibling" : "previousSibling";
			var old_key_nav = current_key_nav_element;
			if (current_key_nav_element[sibling]) {
				var n = current_key_nav_element;
				while ((current_jump < jump) && (n = n[sibling])) { 
					if (!n._hidden) {
						current_jump++;
					}
				}
				
				if (!n && up) {
					self.key_nav_first_item();
				}
				else if (!n && down) {
					self.key_nav_last_item();
				}
				else if (n._hidden) {
					return false;
				}
				else {
					current_key_nav_element = n;
				}
			}
			else {
				return false;
			}

			$remove_class(old_key_nav, "searchtable_key_nav_hover");
		}
		self.key_nav_highlight();
		self.scroll_to_key_nav();
		return true;
	};
	
	self.key_nav_down = function() {
		return key_nav_arrow_action(false, true, 1);
	};

	self.key_nav_up = function() {
		return key_nav_arrow_action(true, false, 1);
	};

	self.key_nav_page_down = function() {
		return key_nav_arrow_action(false, true, 10);
	};

	self.key_nav_page_up = function() {
		return key_nav_arrow_action(true, false, 10);
	};

	self.key_nav_enter = function() {
		if (current_key_nav_element) {
			open_element({ "target": current_key_nav_element });
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
			for (var i = hidden.length - 1; i >= 0; i--) {
				if (data[hidden[i]]._searchname.indexOf(use_search_string) > -1) {
					data[hidden[i]]._el._hidden = false;
					data[hidden[i]]._el.style.display = "block";
					hidden.splice(i, 1);
				}
			}
			scrollbar.update_scroll_height(null, list_name);
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
		if (search_string.length == 0) {
			scrollbar.scroll_to(0);
		}
		search_string = search_string + character;
		self.search_box_input.textContent = search_string;
		$add_class(self.search_box_input, "searchlist_input_active");
		var use_search_string = Formatting.make_searchable_string(search_string);
		for (var i = 0; i < sorted.length; i++) {
			if (!data[sorted[i]]._el._hidden && (data[sorted[i]]._searchname.indexOf(use_search_string) == -1)) {
				data[sorted[i]]._el._hidden = true;
				data[sorted[i]]._el.style.display = "none";
				hidden.push(sorted[i]);
			}
		}
		scrollbar.update_scroll_height(null, list_name);
		return true;
	};

	self.clear_search = function() {
		hotkey_mode_disable();
		search_string = "";
		self.search_box_input.textContent = $l("filter");
		$remove_class(self.search_box_input, "searchlist_input_active");
		self.remove_key_nav_highlight();

		for (var i = 0; i < hidden.length; i++) {
			data[hidden[i]]._el._hidden = false;
			data[hidden[i]]._el.style.display = "block";
		}
		hidden = [];

		if (reinsert.length > 0) {
			self.update_view();
		}
		else {
			scrollbar.update_scroll_height(null, list_name);
		}
	};

	// SCROLL **************************

	// scroll_offset is how many pixels are above the current key navigation element
	// it's important to retain this so the scrollTop isn't shoved 100px in one direction
	// when a user clicks on an album that isn't the key nav item

	self.update_scroll_offset_by_evt = function(evt) {
		self.set_scroll_offset(evt.target.offsetTop - scrollbar.scroll_top);
	};

	self.update_scroll_offset_by_id = function(id) {
		if (id in data) self.update_scroll_offset(data[id]);
	};

	self.update_scroll_offset_by_item = function(data_item) {
		self.set_scroll_offset(data_item._el.offsetTop - scrollbar.scroll_top);
	};

	self.set_scroll_offset = function(offset) {
		if (!offset) offset = 140;
		else if (offset > (self.el.parentNode.offsetHeight - 70)) return;
		else if (offset < 140) offset = 140;
		scroll_offset = offset;
	};

	self.scroll_to_id = function(data_id) {
		if (data_id in data) self.scroll_to(data[data_id]);
	};

	self.scroll_to_key_nav = function() {
		if (current_key_nav_element) self.scroll_to(data[current_key_nav_element._id]);
	};

	self.scroll_to = function(data_item) {
		if (data_item) {
			scrollbar.scroll_to(data_item._el.offsetTop - scroll_offset);
			scrollbar.update_handle_position(list_name);
		}
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
		current_key_nav_element = data_item._el;
		self.key_nav_highlight();
		self.scroll_to(data_item);
	};

	self.set_new_open = function(id) {
		if (!id in data) return;
		if (current_open_element) {
			$remove_class(current_open_element, "searchlist_open_item");
		}
		current_open_element = data[id]._el;
		self.remove_key_nav_highlight();
		current_key_nav_element = data[id]._el;
		$add_class(current_open_element, "searchlist_open_item");
		self.update_scroll_offset_by_item(data[id]);
		self.scroll_to(data[id]);
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

	return self;
};
