function SearchTable(id_key, table_class) {
	var container = null;
	var sort_key = id_key;
	var search_key = id_key;
	var reverse_sort = false;
	if (!table_class) table_class = "";
	var data = {};
	var sorted = [];
	var reinsert = [];
	var removed = [];
	var updated = [];

	var keynavtimer = false;
	var inlinetimer = false;
	var searchstring = "";
	var currentnav = false;
	var scrolloffset = UISCALE * 5;

	var textcontainer = createEl("div", { "class": "inlinesearch_container" });
	var texthelp = createEl("div", { "class": "inlinesearch_help", "textContent": _l("escapetoclear") }, textcontainer);
	var texthdr = createEl("div", { "class": "inlinesearch_hdr", "textContent": _l("searchheader") }, textcontainer);
	var textfield = createEl("span", { "class": "inlinesearch_text" }, texthdr);
	var texthdrheight = UISCALE * 2;
	var table = createEl("table", { "class": table_class });
	var fx_test_top = fx.make(fx.CSSNumeric, textcontainer, 250, "marginTop", "px");
	var fx_test_height = fx.make(fx.CSSNumeric, textcontainer, 250, "height", "px");
	fx_test_height.set(0);

	var that = {};
	that.data = data;
	that.syncdeletes = false;
	that.searchEnabled = function() { return false; };

	// REQUIRED EXTERNAL DEFINITIONS FOR USING THIS OBJECT FACTORY:
	//	that.drawEntry(entry_data);
	//	that.drawUpdate(entry_data);
	//	that.drawNavChange(entry_data, is_current_nav);
	//	that.searchAction(id);

	// OPTIONAL EXTERNAL DEFINITIONS:
	//	that.afterUpdate(json, data);
	//	that.searchEnabled();

	// OPTIONS *******************************************************

	that.changeSortKey = function(new_sort_key) {
		sort_key = new_sort_key;
	};

	that.changeSearchKey = function(new_search_key) {
		search_key = new_search_key;
	};

	that.changeReverseSort = function(reverse) {
		reverse_sort = reverse;
	};

	// LIST MANAGEMENT ***********************************************

	that.update = function(json) {
		var i;
		if (that.syncdeletes) {
			for (i in data) {
				data[i]._delete = true;
			}
		}
		for (i in json) {
			that.updateItem(json[i]);
		}
		if (that.afterUpdate) that.afterUpdate(json, data, sorted);
		if (!inlinetimer) that.updateList();
	};

	that.updateItem = function(json) {
		var toreturn;
		// special hook for albums
		if (typeof(json.cool_lowest) != "undefined") {
			json.cool = (json.cool_lowest < clock.now) ? true : false;
		}
		var id = json[id_key];
		if (typeof(data[id]) == "undefined") {
			data[id] = json;
			data[id]._searchname = removeAccentsAndLC(data[id][search_key]);
			data[id].tr = createEl("tr");
			data[id].tr._search_id = json[id_key];
			that.drawEntry(data[id]);
			toreturn = true;
		}
		else {
			for (var i in json) {
				if (json[i] != data[id][i]) {
					data[id][i] = json[i];
					toreturn = true;
				}
			}
		}

		if (that.syncdeletes) data[id]._delete = false;

		if (toreturn) {
			updated.push(id);
		}

		return toreturn;
	};

	that.reinsertEntry = function(id) {
		var io = sorted.indexOf(id);
		if (io >= 0) {
			sorted.splice(io, 1)[0];
		}
		if (reinsert.indexOf(id) == -1) {
			reinsert.push(id);
		}
	};

	that.reinsertAll = function() {
		sorted.sort(that.sortList);
		for (var i = 0; i < sorted.length; i++) {
			table.appendChild(data[sorted[i]].tr);
		}
	};

	that.addToUpdated = function(id) {
		if (updated.indexOf(id) == -1) updated.push(id);
	};

	that.updateList = function() {
		var i = 0;
		// first we walk through and sort the list to be re-inserted
		if (updated.length > 0) {
			for (i = 0; i < updated.length; i++) {
				that.drawUpdate(data[updated[i]]);
				that.reinsertEntry(updated[i]);
			}
			updated = [];
		}
		reinsert.sort(that.sortList);
		// this could be made to be a little bit faster (the reverse walk below seems extraneous)
		// but this is both really stable and works very well, so I'm quite hesitant to
		// first we walk ONCE through the sorted list, re-inserting entries as necessary
		// into the sorted pile where necessary.  this ensures we're o(n)
		for (i = 0; i < sorted.length; i++) {
			if (reinsert.length == 0) break;
			if (that.sortList(reinsert[0], sorted[i]) == -1) {
				table.insertBefore(data[reinsert[0]].tr, data[sorted[i]].tr);
				sorted.splice(i, 0, reinsert.shift());
			}
		}
		// finish adding any leftovers at the bottom of the pile
		for (i = 0; i < reinsert.length; i++) {
			sorted.push(reinsert[i]);
			table.appendChild(data[reinsert[i]].tr);
		}
		// walk backwards through the list for deleted elements
		for (i = sorted.length - 1; i >= 0; i--) {
			if (data[sorted[i]]._delete) {
				table.removeChild(data[sorted[i]].tr);
				delete(data[sorted[i]]);
				sorted.splice(i, 1);
			}
		}
		reinsert = [];
	};

	that.appendToContainer = function(new_container) {
		container = new_container;
		container.appendChild(textcontainer);
		container.appendChild(table);
	};

	that.sortList = function(a, b) {
		var toret = 0;
		if (data[a][sort_key] < data[b][sort_key]) toret = -1;
		else if (data[a][sort_key] > data[b][sort_key]) toret = 1;
		if (!reverse_sort || (toret == 0)) return toret;
		else if (toret == -1) return 1;
		else return -1;
	};

	// SEARCHING ****************************

	that.keyHandle = function(evt) {
		if (sorted.length < 10) return;	// fixes searching before the page loads
		// only go if we have focus or we're not inside the MPI
		if (!that.searchEnabled()) return true;

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
			that.navDown();
			if (inlinetimer) resettimer = true;
			resetkeytimer = true;
		}
		else if (evt.keyCode == 38) {		// up arrow
			that.navUp();
			if (inlinetimer) resettimer = true;
			resetkeytimer = true;
		}
		else if ((evt.keyCode == 13) && keynavtimer && currentnav) {		// enter
			bubble = false;
			that.clearInlineSearch();
			that.searchAction(currentnav._search_id);
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
			that.performSearch(searchstring);
		}

		if (inlinetimer && (evt.keyCode == 8)) {		// backspace
			bubble = false;
			if (searchstring.length == 1) {
				that.clearInlineSearch();
			}
			else {
				resettimer = true;
				searchstring = searchstring.substring(0, searchstring.length - 1);
				that.performSearchBackspace(searchstring);
			}
		}

		if (resettimer) {
			// if (inlinetimer) clearTimeout(inlinetimer);
			// inlinetimer = setTimeout(that.clearInlineSearch, 60000);
			inlinetimer = true;
		}
		if (resetkeytimer) {
			if (keynavtimer) clearTimeout(keynavtimer);
			keynavtimer = setTimeout(that.navClear, 5000);
		}

		if (inlinetimer && (evt.keyCode == 27)) {	// escape
			that.navClear();
			that.clearInlineSearch();
			bubble = false;
		}

		return bubble;
	};

	that.performSearch = function(text) {
		var i;
		var j;
		text = text.toLowerCase();

		for (i = 0; i < sorted.length; i++) {
			if (data[sorted[i]]._searchname.indexOf(text) == -1) {
				data[sorted[i]].tr.style.display = "none";
				removed.push(sorted[i]);
			}
		}

		if (!inlinetimer) that.startSearchDraw();
		textfield.textContent = text;
	};

	that.performSearchBackspace = function(text) {
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

	that.clearInlineSearch = function() {
		//if (inlinetimer) clearTimeout(inlinetimer);
		inlinetimer = false;
		searchstring = "";

		that.navClear();

		if (removed.length > 0) {
			for (var i = 0; i < removed.length; i++) {
				data[removed[i]].tr.style.display = "table-row";
			}
			removed = [];
			that.updateList();
		}

		that.clearSearchDraw();
	};

	// SCROLL **************************

	that.updateScrollOffsetByEvt = function(evt) {
		that.setScrollOffset(evt.target.offsetTop - container.scrollTop);
	};

	that.updateScrollOffsetByID = function(id) {
		if (id in data) that.updateScrollOffset(data[id]);
	};

	that.updateScrollOffset = function(entry) {
		that.setScrollOffset(entry.tr.offsetTop - container.scrollTop);
	};

	that.setScrollOffset = function(offset) {
		if (offset && (offset > UISCALE * 5)) {
			scrolloffset = offset;
		}
		else {
			scrolloffset = UISCALE * 5;
		}
	};

	that.scrollToID = function(entry_id) {
		if (entry_id in data) that.scrollTo(data[entry_id]);
	};

	that.scrollToCurrent = function() {
		if (currentnav) that.scrollTo(data[currentnav._search_id]);
	};

	that.scrollTo = function(entry) {
		if (entry) {
			container.scrollTop = entry.tr.offsetTop - scrolloffset;
		}
	};

	// NAV *****************************

	that.navGet = function() {
		if (!keynavtimer) return 0;
		if (currentnav) return currentnav._search_id;
		return 0;
	};

	that.preNavCheck = function() {
		if (currentnav && (currentnav.style.display == "none")) {
			that.drawNavChange(data[currentnav._search_id], false);
			currentnav = false;
		}
		if (!currentnav) {
			currentnav = table.firstChild;
			while (currentnav.style.display == "none") {
				if ((currentnav == table.lastChild) && (currentnav.style.display == "none")) return false;
				currentnav = currentnav.nextSibling;
			}
			that.drawNavChange(data[currentnav._search_id], true);
			return false;
		}
		return true;
	};

	that.navClear = function() {
		if (keynavtimer) clearTimeout(keynavtimer);
		keynavtimer = false;
		if (currentnav) that.drawNavChange(data[currentnav._search_id], false);
	};

	that.navToID = function(id) {
		if (id in data) that.navTo(data[id].tr);
		else that.navClear();
	};

	that.navTo = function(newnav) {
		if (currentnav) that.drawNavChange(data[currentnav._search_id], false);
		currentnav = newnav;
		that.drawNavChange(data[currentnav._search_id], true);
		that.scrollTo(data[currentnav._search_id]);
	};

	that.navDown = function() {
		if (!that.preNavCheck()) return false;
		if (!currentnav.nextSibling) return false;
		var next = currentnav.nextSibling;
		while (next.style.display == "none") {
			if (next == table.lastChild) return false;
			next = next.nextSibling;
		}
		that.navTo(next);
		return true;
	};

	that.navUp = function() {
		if (!that.preNavCheck()) return;
		if (!currentnav.previousSibling) return;
		var prev = currentnav.previousSibling;
		while (prev.style.display == "none") {
			if (prev == table.firstChild) return false;
			prev = prev.previousSibling;
		}
		that.navTo(prev);
	};

	// DRAWING ********

	that.startSearchDraw = function() {
		that.setScrollOffset();
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

	that.clearSearchDraw = function() {
		fx_test_top.start(0);
		fx_test_height.start(0);
		textfield.textContent = "";
	};

	hotkey.addCallback(that.keyHandle, 0);

	return that;
};
