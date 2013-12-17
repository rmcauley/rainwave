'use strict';

// REQUIRED EXTERNAL DEFINITIONS FOR USING THIS OBJECT FACTORY:
//	draw_entry(item);				// return a new element (will be using display: block, you SHOULD make a div)
//  update_item_element(item);		// return nothing, just update text/etc in the element you created above

// OPTIONAL FUNCTIONS you can overwrite:
//	after_update(json, data, sorted_data);
//  sort_function(a, b);			// normal Javascript sort method - return -1, 0, or 1 (default just uses id_key)

function SearchList(list_name, id_key, sort_key, search_key, scrollbar) {
	var self = {};
	self.list_name = list_name;
	self.sort_key = sort_key;
	self.search_key = search_key || id_key;
	self.auto_trim = false;
	self.after_update = null;
	self.el = $el("div", { "class": "searchlist" });
	var search_box = self.el.appendChild($el("div", { "class": "searchlist_input_box" }));

	var data = {};				// raw data
	var sorted = [];			// list of IDs sorted by the sort_function (always maintained, contains all IDs)
	var reinsert = [];			// list of IDs unsorted - will be resorted in the list when the user is not in a search
	var hidden = [];			// list of IDs unsorted - currently hidden from view during a search

	var search_string = "";
	var current_key_nav_element = false;
	var current_key_nav_old_class = "";
	var scroll_offset = 100;

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
		if (self.after_update) self.after_update(json, data, sorted);
		self.update_view();
	};

	self.update_item = function(json) {
		json._delete = false;
		if (json[id_key] in data) {
			json._searchname = data[json[id_key]]._searchname;
			json._el = data[json[id_key]]._el;
			self.update_item_element(json);
		}
		else {
			json._searchname = json[search_key];
			json._el = self.draw_entry(json);
			json._el._id = json[id_key];
			json._el._hidden = false;
		}
		data[json[id_key]] = json;
		self.queue_reinsert(json[id_key]);
	};

	self.queue_reinsert = function(id) {
		var io = sorted.indexOf(id);
		if (io >= 0) {
			sorted.splice(io, 1)[0];
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
		scrollbar.update_scroll_height(list_name);
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
			else if (next_reinsert_id && (self.sort_function(reinsert[next_reinsert_id], sorted[i]) == 1)) {
				self.el.insertBefore(data[next_reinsert_id]._el, data[sorted[i]]._el);
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
		//scrollbar.update_scroll_height($measure_el(self.el).height, list_name);
		scrollbar.update_scroll_height(false, list_name);
	};

	self.sort_function = function(a, b) {
		if (data[a][sort_key] < data[b][sort_key]) return 1;
		else if (data[a][sort_key] > data[b][sort_key]) return -1;
		return 0;
	};

	// SEARCHING ****************************

	self.remove_key_nav_highlight = function() {
		if (current_key_nav_element) {
			current_key_nav_element.className = current_key_nav_old_class;
			current_key_nav_old_class = "";
			current_key_nav_element = false;
		}
	};

	self.key_nav_highlight = function() {
		current_key_nav_old_class = current_key_nav_element.className;
		current_key_nav_element.className = "searchtable_key_nav_hover";
	}

	var key_nav_arrow_action = function(up, down) {
		if (!current_key_nav_element) {
			// select the first child
			current_key_nav_element = self.el.firstChild.nextSibling;
			if (!current_key_nav_element) {
				return false;
			}
			// find the next non-hidden child (if the firstChild isn't)
			while (current_key_nav_element._hidden && current_key_nav_element.nextSibling) { 
				current_key_nav_element = current_key_nav_element.nextSibling;
			}
		}
		else {
			if (current_key_nav_old_class) {
				current_key_nav_element.className = current_key_nav_old_class;
			}
			else {
				current_key_nav_element.removeAttribute("class");	
			}
			// go in the appropriate direction through the DOM
			if (down && current_key_nav_element.nextSibling) {
				current_key_nav_element = current_key_nav_element.nextSibling;
				while (current_key_nav_element._hidden && current_key_nav_element.nextSibling) { 
					current_key_nav_element = current_key_nav_element.nextSibling;
				}
			}
			else if (up && current_key_nav_element.previousSibling && (current_key_nav_element.previousSibling != search_box)) {
				current_key_nav_element = current_key_nav_element.previousSibling;
				while (current_key_nav_element._hidden && current_key_nav_element.previousSibling) { 
					current_key_nav_element = current_key_nav_element.previousSibling;
				}	
			}
			else {
				return false;
			}
		}
		self.key_nav_highlight();
		scrollbar.update_handle_position(list_name);
		return true;
	}
	
	self.key_nav_down = function() {
		return key_nav_arrow_action(false, true);
	};

	self.key_nav_up = function() {
		return key_nav_arrow_action(true, false);
	};

	self.key_nav_enter = function() {
		if (current_key_nav_element) {
			// TODO: open album
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
			search_box.textContent = search_string;
			var use_search_string = Formatting.remove_non_alphanum(Formatting.sanitize_string(search_string));
			for (var i = hidden.length - 1; i >= 0; i--) {
				if (data[hidden[i]]._searchname.indexOf(use_search_string) > -1) {
					data[hidden[i]]._el._hidden = false;
					data[hidden[i]]._el.style.display = "block";
					hidden.splice(i, 1);
				}
			}
			scrollbar.update_scroll_height(list_name);
			return true;
		}
		return false;
	};

	self.key_nav_add_character = function(character) {
		search_string = search_string + character;
		var use_search_string = Formatting.remove_non_alphanum(Formatting.sanitize_string(search_string));
		for (var i = 0; i < sorted.length; i++) {
			if (!data[sorted[i]]._el._hidden && (data[sorted[i]]._searchname.indexOf(use_search_string) == -1)) {
				data[sorted[i]]._el._hidden = true;
				data[sorted[i]]._el.style.display = "none";
				hidden.push(sorted[i]);
			}
		}
		scrollbar.update_scroll_height(list_name);
		search_box.textContent = search_string;
	};

	self.clear_search = function() {
		search_string = "";
		self.remove_key_nav_highlight();
		search_box.textContent = "";

		for (var i = 0; i < hidden.length; i++) {
			data[hidden[i]]._el._hidden = false;
			data[hidden[i]]._el.style.display = "block";
		}
		hidden = [];

		if (reinsert.length > 0) {
			self.update_view();
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
		scroll_offset = (offset && (offset > 70)) ? offset : 70;
	};

	self.scroll_to_id = function(data_id) {
		if (data_id in data) self.scroll_to(data[data_id]);
	};

	self.scroll_to_key_nav = function() {
		if (current_key_nav_element) self.scroll_to(data[current_key_nav_element._search_id]);
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

	return self;
};
