'use strict';

// REQUIRED EXTERNAL DEFINITIONS FOR USING THIS OBJECT FACTORY:
//  sort_function(a, b);			// normal Javascript sort method - return -1, 0, or 1 (default just uses id_key)
//	draw_entry(item);				// return an element
//  update_item_element(item);		// return nothing

//	drawNavChange(entry_data, is_current_nav);
//	searchAction(id);

// OPTIONAL FUNCTIONS:
//	after_update(json, data, sorted_data);

function SearchTable(id_key, sort_key, container, search_box) {
	var self = {};
	self.sort_key = sort_key;
	self.search_key = id_key;
	self.auto_trim = false;
	self.after_update = null;

	var data = {};				// raw data
	var sorted = [];			// list of IDs sorted by the sort_function (always maintained, contains all IDs)
	var reinsert = [];			// list of IDs unsorted - will be resorted in the list when the user is not in a search
	var hidden = [];			// list of IDs unsorted - currently hidden from view during a search

	var search_string = "";
	var current_key_nav_element = false;
	var scroll_offset = 15 * 5;

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
			json._searchname = Formatting.sanitize_string(json[search_key]).toLowerCase();
			json._el = self.draw_entry(json);
			json._el._rw_id = json[id_key];
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
			container.appendChild(data[sorted[i]]._el);
		}
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
				container.removeChild(data[sorted[i]]._el);
				delete(data[sorted[i]]);
				sorted.splice(i, 1);
			}
			else if (next_reinsert_id && (self.sort_function(reinsert[next_reinsert_id], sorted[i]) == 1)) {
				container.insertBefore(data[next_reinsert_id]._el, data[sorted[i]]._el);
				sorted.splice(i - 1, 0, next_reinsert_id);
				next_reinsert_id = reinsert.pop();
			}
		}
		// finish adding any leftovers at the bottom of the pile
		while (next_reinsert_id) {
			sorted.push(next_reinsert_id);
			container.appendChild(data[next_reinsert_id._el);
			next_reinsert_id = reinsert.pop();
		}
	};

	self.sort_function = function(a, b) {
		if (data[a][sort_key] < data[b][sort_key]) return -1;
		else if (data[a][sort_key] > data[b][sort_key]) return 1;
		return 0;
	};

	self.reverse_sort_function = function(a, b) {
		if (data[a][sort_key] < data[b][sort_key]) return 1;
		else if (data[a][sort_key] > data[b][sort_key]) return -1;
		return 0;
	};

	// SEARCHING ****************************

	self.remove_key_nav_highlight = function() {
		if (current_key_nav_element) {
			current_key_nav_element.className = "";
			current_key_nav_element = false;
		}
	};

	var key_nav_arrow_action = function(up, down) {
		if (!current_key_nav_element) {
			current_key_nav_element = container.firstChild;
		}
		else {
			if (current_key_nav_element.className == "searchtable_key_nav_hover") {
				current_key_nav_element.className = "";
			}
			if (down) {
				current_key_nav_element = current_key_nav_element.nextSibling;
				while (current_key_nav_element._hidden && current_key_nav_element.nextSibling) { 
					current_key_nav_element = current_key_nav_element.nextSibling;
				}
			}
			else if (up) {
				current_key_nav_element = current_key_nav_element.previousSibling;
				while (current_key_nav_element._hidden && current_key_nav_element.previousSibling) { 
					current_key_nav_element = current_key_nav_element.previousSibling;
				}	
			}
		}
		current_key_nav_element.className = "searchtable_key_nav_hover";
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
			resettimer = true;
			search_string = search_string.substring(0, search_string.length - 1);
			search_box.textContent = search_string;
			for (var i = hidden.length - 1; i >= 0; i++) {
				if (data[hidden[i]]._searchname.indexOf(search_string) > -1) {
					data[hidden[i]]._el._hidden = false;
					data[hidden[i]]._el.style.display = "block";
					hidden.splice(i, 1);
				}
			}
			return true;
		}
		return false;
	};

	self.key_nav_add_character = function(character) {
		search_string = search_string + Formatting.sanitize_string(character);
		for (var i = 0; i < sorted.length; i++) {
			if (data[sorted[i]]._searchname.indexOf(search_string) == -1) {
				data[sorted[i]]._el._hidden = true;
				data[hidden[i]]._el.style.display = "none";
				hidden.push(sorted[i]);
			}
		}
		search_box.textContent = search_string;
	};

	self.clear_search = function() {
		search_string = "";
		self.remove_key_nav_highlight();

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

	self.updateScrollOffsetByEvt = function(evt) {
		self.setScrollOffset(evt.target.offsetTop - container.scrollTop);
	};

	self.updateScrollOffsetByID = function(id) {
		if (id in data) self.updateScrollOffset(data[id]);
	};

	self.updateScrollOffset = function(entry) {
		self.setScrollOffset(entry.tr.offsetTop - container.scrollTop);
	};

	self.setScrollOffset = function(offset) {
		if (offset && (offset > UISCALE * 5)) {
			scrolloffset = offset;
		}
		else {
			scrolloffset = UISCALE * 5;
		}
	};

	self.scrollToID = function(entry_id) {
		if (entry_id in data) self.scrollTo(data[entry_id]);
	};

	self.scrollToCurrent = function() {
		if (currentnav) self.scrollTo(data[currentnav._search_id]);
	};

	self.scrollTo = function(entry) {
		if (entry) {
			container.scrollTop = entry.tr.offsetTop - scrolloffset;
		}
	};

	// NAV *****************************

	self.navGet = function() {
		if (!keynavtimer) return 0;
		if (currentnav) return currentnav._search_id;
		return 0;
	};

	self.preNavCheck = function() {
		if (currentnav && (currentnav.style.display == "none")) {
			self.drawNavChange(data[currentnav._search_id], false);
			currentnav = false;
		}
		if (!currentnav) {
			currentnav = table.firstChild;
			while (currentnav.style.display == "none") {
				if ((currentnav == table.lastChild) && (currentnav.style.display == "none")) return false;
				currentnav = currentnav.nextSibling;
			}
			self.drawNavChange(data[currentnav._search_id], true);
			return false;
		}
		return true;
	};

	self.navClear = function() {
		if (keynavtimer) clearTimeout(keynavtimer);
		keynavtimer = false;
		if (currentnav) self.drawNavChange(data[currentnav._search_id], false);
	};

	self.navToID = function(id) {
		if (id in data) self.navTo(data[id].tr);
		else self.navClear();
	};

	self.navTo = function(newnav) {
		if (currentnav) self.drawNavChange(data[currentnav._search_id], false);
		currentnav = newnav;
		self.drawNavChange(data[currentnav._search_id], true);
		self.scrollTo(data[currentnav._search_id]);
	};

	self.navDown = function() {
		if (!self.preNavCheck()) return false;
		if (!currentnav.nextSibling) return false;
		var next = currentnav.nextSibling;
		while (next.style.display == "none") {
			if (next == table.lastChild) return false;
			next = next.nextSibling;
		}
		self.navTo(next);
		return true;
	};

	self.navUp = function() {
		if (!self.preNavCheck()) return;
		if (!currentnav.previousSibling) return;
		var prev = currentnav.previousSibling;
		while (prev.style.display == "none") {
			if (prev == table.firstChild) return false;
			prev = prev.previousSibling;
		}
		self.navTo(prev);
	};

	return self;
};
