'use strict';

// REQUIRED EXTERNAL DEFINITIONS FOR USING THIS OBJECT FACTORY:
//  sort_function(a, b);			// normal Javascript sort method - return -1, 0, or 1 (default just uses id_key)
//	draw_entry(item);				// return an element
//  update_item_element(item);		// return nothing

//	drawNavChange(entry_data, is_current_nav);
//	searchAction(id);

// OPTIONAL FUNCTIONS:
//	after_update(json, data, sorted_data);
//	is_search_enabled();

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

	var searchstring = "";
	var currentnav = false;
	var scrolloffset = 15 * 5;

	// can be overridden for more complicatedness
	self.is_search_enabled = function() { return false; };

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
	// LEFT OFF REFACTORING HERE

	self.keyHandle = function(evt) {
		if (sorted.length < 10) return;	// fixes searching before the page loads
		// only go if we have focus or we're not inside the MPI
		if (!self.is_search_enabled()) return true;

		var resettimer = false;
		var resetkeytimer = false;
		var bubble = true;
		var chr = '';
		if (!('charCode' in evt)) {
			chr = String.fromCharCode(evt.keyCode);
		}
		else if (evt.charCode > 0) {
			chr = String.fromCharCode(evt.charCode);
		}

		var dosearch = false;
		if (evt.keyCode == 40) {			// down arrow
			self.navDown();
			if (inlinetimer) resettimer = true;
			resetkeytimer = true;
		}
		else if (evt.keyCode == 38) {		// up arrow
			self.navUp();
			if (inlinetimer) resettimer = true;
			resetkeytimer = true;
		}
		else if ((evt.keyCode == 13) && keynavtimer && currentnav) {		// enter
			bubble = false;
			self.clearInlineSearch();
			self.searchAction(currentnav._search_id);
		}
		else if (/[\d\w\-.&':+~,]+/.test(chr)) {
			dosearch = true;
		}
		else if (chr == " ") {		// spacebar
			dosearch = true;
			bubble = false;
		}

		if (dosearch) {
			bubble = false;
			resettimer = true;
			searchstring += chr;
			self.performSearch(searchstring);
		}

		if (inlinetimer && (evt.keyCode == 8)) {		// backspace
			bubble = false;
			if (searchstring.length == 1) {
				self.clearInlineSearch();
			}
			else {
				resettimer = true;
				searchstring = searchstring.substring(0, searchstring.length - 1);
				self.performSearchBackspace(searchstring);
			}
		}

		if (resettimer) {
			// if (inlinetimer) clearTimeout(inlinetimer);
			// inlinetimer = setTimeout(self.clearInlineSearch, 60000);
			inlinetimer = true;
		}
		if (resetkeytimer) {
			if (keynavtimer) clearTimeout(keynavtimer);
			keynavtimer = setTimeout(self.navClear, 5000);
		}

		if (inlinetimer && (evt.keyCode == 27)) {	// escape
			self.navClear();
			self.clearInlineSearch();
			bubble = false;
		}

		return bubble;
	};

	self.performSearch = function(text) {
		var i;
		var j;
		text = text.toLowerCase();

		for (i = 0; i < sorted.length; i++) {
			if (data[sorted[i]]._searchname.indexOf(text) == -1) {
				data[sorted[i]].tr.style.display = "none";
				removed.push(sorted[i]);
			}
		}

		if (!inlinetimer) self.startSearchDraw();
		textfield.textContent = text;
	};

	self.performSearchBackspace = function(text) {
		textfield.textContent = text;
		text = text.toLowerCase();
		var unremove = [];
		for (var i in removed) {
			if (data[removed[i]]._searchname.indexOf(text) > -1) {
				data[removed[i]].tr.style.display = "table-row";
				unremove.push(i);
			}
		}
		for (i in unremove) removed.splice(unremove[i], 1);
	};

	self.clearInlineSearch = function() {
		//if (inlinetimer) clearTimeout(inlinetimer);
		inlinetimer = false;
		searchstring = "";

		self.navClear();

		if (removed.length > 0) {
			for (var i = 0; i < removed.length; i++) {
				data[removed[i]].tr.style.display = "table-row";
			}
			removed = [];
			self.updateList();
		}

		self.clearSearchDraw();
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

	// DRAWING ********

	self.startSearchDraw = function() {
		self.setScrollOffset();
		if (container.parentNode.className == "splitwindow_left") {
			textcontainer.style.width = container.parentNode.style.width;
		}
		else {
			textcontainer.style.width = container.style.left;
		}
		var h = texthdrheight;
		fx_test_top.start(-h);
		fx_test_height.start(h);
		textfield.textContent = "";
	};

	self.clearSearchDraw = function() {
		fx_test_top.start(0);
		fx_test_height.start(0);
		textfield.textContent = "";
	};

	hotkey.addCallback(self.keyHandle, 0);

	return that;
};
