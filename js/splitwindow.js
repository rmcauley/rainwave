function SplitWindow(name, container, table_class) {
	var table = createEl("table", { "style": "width: 100%; table-layout: fixed; height: " + container.offsetHeight + "px;", "class": "splitwindow_table" });
	var row = createEl("tr", false, table);
	var tabs_td = createEl("td", { "class": "splitwindow_tabs_td" }, row);
	var bar = createEl("td", { "class": "splitwindow_resize", "rowspan": 2 }, row);
	var right = createEl("td", { "class": "splitwindow_right", "rowspan": 2 }, row);
	var row2 = createEl("tr", false, table);
	var left = createEl("td", { "class": "splitwindow_left" }, row2);
	container.appendChild(table);
	
	var that = {};
	that.currentidopen = false;
	
	// RESIZE MANAGEMENT
	prefs.addPref("splitwindow", { "name": "sizeleft_" + name, "defaultvalue": 200, "hidden": true });	
	prefs.addPref("splitwindow", { "name": "lasttab_" + name, "defaultvalue": false, "hidden": true });
	left.style.width = prefs.getPref("splitwindow", "sizeleft_" + name) + "px";
	tabs_td.style.width = prefs.getPref("splitwindow", "sizeleft_" + name) + "px";
	
	var resize_mx;
	var resize_last_width = prefs.getPref("splitwindow", "sizeleft_" + name);
	var resize_final_width = resize_last_width;
	var maxwidth = container.offsetWidth;
	var height = container.offsetHeight;
	
	that.startResize = function(e) {
		resize_mx = getMousePosX(e);
		maxwidth = container.offsetWidth;
		document.addEventListener("mousemove", that.runningResize, true);
		document.addEventListener("mouseup", that.stopResize, true);
	};
	
	that.runningResize = function(e) {
		var mx = getMousePosX(e);
		var width = resize_last_width + (mx - resize_mx);
		if (width > (maxwidth - 300)) width = maxwidth - 300;
		if (width < 200) width = 200;
		left.style.width = width + "px";
		tabs_td.style.width = width + "px";
		resize_final_width = width;
	};
	
	that.stopResize = function(e) {
		document.removeEventListener('mousemove', that.runningResize, true);
		document.removeEventListener('mouseup', that.stopColumnResize, true);
		prefs.changePref("splitwindow", "sizeleft_" + name, resize_final_width);
		resize_last_width = resize_final_width;
	};
	
	bar.addEventListener('mousedown', that.startResize, true);
	
	// TAB MANAGEMENT

	var firsttab = false;
	var currenttab;
	var tabs = {};
	var tabdivs = {};
	var tabul = createEl("ul", { "class": "splitwindow_tabs" }, tabs_td);
	var tabinitfunc = {};
	
	that.getCurrentTab = function() {
		return currenttab;
	};
	
	that.addTab = function(key, title, initfunc) {
		tabs[key] = createEl("li", { "class": "splitwindow_tab", "textContent": title }, tabul);
		tabs[key]._tabkey = key;
		tabs[key].addEventListener("click", that.switchToTabByEvt, true);
		tabdivs[key] = createEl("div", { "class": "splitwindow_leftcontainer" });
		tabinitfunc[key] = initfunc;
		if (!firsttab) firsttab = key;
		return tabdivs[key];
	};
	
	that.initTabs = function() {
		var defaulttab = prefs.getPref("splitwindow", "lasttab_" + name);
		if (!defaulttab) defaulttab = firsttab;
		that.switchToTab(defaulttab);
	};
	
	that.switchToTabByEvt = function(evt) {
		that.switchToTab(evt.currentTarget._tabkey);
	};
	
	that.switchToTab = function(newtab) {
		if (newtab == currenttab) return;
		if (tabinitfunc[newtab]) {
			tabinitfunc[newtab](that);
			tabinitfunc[newtab] = false;
		}
		if (currenttab) {
			left.removeChild(tabdivs[currenttab]);
			tabs[currenttab].className = "splitwindow_tab";
		}
		currenttab = newtab;
		left.appendChild(tabdivs[currenttab]);
		tabs[currenttab].className = "splitwindow_tab splitwindow_tab_active";
		prefs.changePref("splitwindow", "lasttab_" + name, currenttab);
	};
	
	that.getTab = function(key) {
		if (tabs[key]) return tabs[key];
	};
	
	that.getTabDiv = function(key) {
		if (tabdivs[key]) return tabdivs[key];
	};
	
	// OTHER
	
	that.setHeight = function(newheight) {
		height = newheight;
		table.style.height = height + "px";
		var divh = height - tabs_td.offsetHeight;
		for (var i in tabdivs) {
			tabdivs[i].style.height = divh + "px";
		}
		if (opendivs.length > 0) {
			opendivs[opendivs.length - 1].div.style.height = height + "px";
		}
	};
	
	// DIV MANAGEMENT

	var opendivs = [];
	
	that.isAnyDivOpen = function(type) {
		for (var i in opendivs) {
			if (opendivs[i].type == type) return true;
		}
		return false;
	};
	
	that.createOpenDiv = function(type, id) {
		while (opendivs.length > 25) {
			if (typeof(opendivs[0].destruct) == "function") {
				opendivs[0].destruct(opendivs[0]);
			}
			right.removeChild(opendivs[0].div);
			opendivs.shift();
		}
		for (i = 0; i < opendivs.length; i++) {
			opendivs[i].div.style.display = "none";
		}
		var div = createEl("div", { "class": "pl_opendiv", "style": "height: " + height + "px;" });
		right.appendChild(div);
		opendivs.push({ "div": div, "type": type, "id": id });
		return opendivs[opendivs.length - 1];
	};

	that.reOpenDiv = function(type, id) {
		if (opendivs.length == 0) return;
		var reopen = false;
		if ((opendivs[opendivs.length - 1].type == type) && (id == opendivs[opendivs.length - 1].id)) {
			reopen = true;
		}
		for (var i = 0; i < opendivs.length; i++) {
			if ((opendivs[i].type == type) && (opendivs[i].id == id)) {
				if (typeof(opendivs[i].destruct) == "function") {
					opendivs[i].destruct(opendivs[i]);
				}
				right.removeChild(opendivs[i].div);
				opendivs.splice(i, 1);
			}
		}
		return reopen;
	};
	
	that.checkOpenDivs = function(type, id) {
		var found = false;
		for (var i = 0; i < opendivs.length; i++) {
			if ((opendivs[i].type == type) && (opendivs[i].id == id)) {
				if (i == opendivs.length - 1) {
					return true;
				}
				found = true;
				opendivs[i].div.style.display = "block";
				opendivs[i].div.style.height = height + "px";
				if (typeof(opendivs[i].updateHelp) == "function") opendivs[i].updateHelp();
				if (typeof(opendivs[i].continueTutorial) == "function") opendivs[i].continueTutorial();
				opendivs.push(opendivs.splice(i, 1)[0]);
				break;
			}
		}
		if (!found) return false;
		for (i = 0; i < opendivs.length - 1; i++) {
			opendivs[i].div.style.display = "none";
		}
		return true;
	};
	
	return that;
};