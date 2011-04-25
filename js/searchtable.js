function SearchTable(container, id_key, sort_key, table_class) {
	if (!sort_key) sort_key = id_key;
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
	
	var table = createEl("table", { "class": table_class }, container);
	
	var that = {};
	that.data = data;
	that.searchEnabled = function() { return false; };
	
	// REQUIRED EXTERNAL DEFINITIONS FOR USING THIS OBJECT FACTORY:
	//	that.drawEntry(entry_data);
	//	that.drawUpdate(entry_data);
	//	that.drawNavChange(entry_data, is_current_nav);
	//	that.searchAction(id);
	//	that.startSearchDraw();
	//	that.drawSearchString();
	//	that.clearSearchDraw();
	//	that.scrollTo();
	
	// OPTIONAL EXTERNAL DEFINITIONS:
	//	that.afterUpdate(json, data);
	//	that.searchEnabled();
	
	// LIST MANAGEMENT ***********************************************

	that.update = function(json) {
		for (var i in json) {
			that.updateItem(json[i]);
		}
		if (that.afterUpdate) that.afterUpdate(json, data, sorted);
		if (!inlinetimer) that.updateList();
	};
	
	that.updateItem = function(json) {
		var toreturn;
		// special hook for albums
		if (typeof(json.album_lowest_oa) != "undefined") {
			json.album_available = (json.album_lowest_oa < clock.now) ? true : false;
		}
		var id = json[id_key];
		if (typeof(data[id]) == "undefined") {
			data[id] = json;
			data[id]._searchname = removeAccentsAndLC(data[id].album_name);
			data[id].tr = createEl("tr");
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
			that.drawUpdate(data[id]);
		}
		
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
	
	that.addToUpdated = function(id) {
		if (updated.indexOf(id) == -1) updated.push(id);
	};
	
	that.updateList = function() {
		var i = 0;
		if (updated.length > 0) {
			for (i = 0; i < updated.length; i++) that.reinsertEntry(updated[i]);
			updated = [];
		}
		reinsert.sort(that.sortList);
		for (i = 0; i < sorted.length; i++) {
			if (reinsert.length == 0) break;
			if (that.sortList(reinsert[0], sorted[i]) == -1) {
				table.insertBefore(data[reinsert[0]].tr, data[sorted[i]].tr);
				sorted.splice(i, 0, reinsert.shift());
			}
		}
		for (i = 0; i < reinsert.length; i++) {
			sorted.push(reinsert[i]);
			table.appendChild(data[reinsert[i]].tr);
		}
		reinsert = [];
	};
	
	that.sortList = function(a, b) {
		if (data[a][sort_key] < data[b][sort_key]) return -1;
		else if (data[a][sort_key] > data[b][sort_key]) return 1;
		else return 0;
	};
	
	// SEARCHING **************************** 
	
	that.keyHandle = function(evt) {
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
			that.searchAction(currentnav[id_key]);
		}
		else if (/[\d\w\-.&]+/.test(chr)) {
			dosearch = true;
		}
		else if (evt.keyCode == 32) {		// spacebar
			dosearch = true;
			bubble = false;
		}
		
		if (dosearch && !inlinetimer) {
			that.startSearchDraw();
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
			if (inlinetimer) clearTimeout(inlinetimer);
			inlinetimer = setTimeout(that.clearInlineSearch, 20000);
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
	
	that.navGet = function() {
		if (!keynavtimer) return 0;
		if (currentnav) return currentnav[id_key];
		return 0;
	};
	
	that.preNavCheck = function() {
		if (currentnav && !currentnav.tr.parentNode) {
			that.drawNavChange(currentnav, false);
		}
		if (!currentnav) {
			currentnav = data[sorted[0]];
			that.drawNavChange(currentnav, true);
			return false;
		}
		return true;
	};
	
	that.navClear = function() {
		if (keynavtimer) clearTimeout(keynavtimer);
		keynavtimer = false;
		if (currentnav) that.drawNavChange(currentnav, false);
	};
	
	that.navToID = function(id) {
		that.navTo(data[id]);
	};
	
	that.navTo = function(newnav) {
		if (currentnav) that.drawNavChange(currentnav, false);
		currentnav = newnav;
		that.drawNavChange(currentnav, true);
		that.scrollTo(currentnav);
	};
	
	that.navDown = function() {
		if (!that.preNavCheck()) return;
		if (!currentnav.tr.nextSibling) return;
		that.navTo(currentnav.tr.nextSibling);
	};
	
	that.navUp = function() {
		if (!that.preNavCheck()) return;
		if (!currentnav.tr.previousSibling) return;
		that.navTo(currentnav.tr.previousSibling)
	};
	
	that.performSearch = function(text) {
		that.drawSearchString(searchstring);
		var i;
		var j;
		text = text.toLowerCase();
		
		for (i = 0; i < sorted.length; i++) {
			if (data[sorted[i]]._searchname.indexOf(text) == -1) {
				data[sorted[i]].tr.style.display = "none";
				removed.push(sorted[i]);
			}
		}
	};
	
	that.performSearchBackspace = function(text) {
		that.drawSearchString(searchstring);
		text = text.toLowerCase();
		var unremove = [];
		for (var i in removed) {
			if (data[removed[i]]._searchname.indexOf(text) > -1) {
				data[sorted[i]].tr.style.display = "table-row";
				unremove.push(i);
			}
		}
		for (i in unremove) removed.splice(unremove[i], 1);
	};
	
	that.clearInlineSearch = function() {
		that.clearSearchDraw();
		if (inlinetimer) clearTimeout(inlinetimer);
		inlinetimer = false;
		searchstring = "";
		
		that.navClear();
		
		if (removed.length > 0) {
			for (var i = 0; i < searchremoved.length; i++) {
				data[sorted[i]].tr.style.display = "table-row";
			}
			searchremoved = [];
			that.updateList();
		}
	};
	
	hotkey.addCallback(that.keyHandle, 0);
	
	return that;
};