function SplitWindow(name, container, table_class) {
	var table = createEl("table", { "style": "width: 100%; table-layout: fixed; height: " + container.offsetHeight + "px;", "class": "splitwindow_table" }, container);
	var row = createEl("tr", false, table);
	var tabs_td = createEl("td", { "class": "splitwindow_tabs_td" }, row);
	var bar = createEl("td", { "class": "splitwindow_resize", "rowspan": 2 }, row);
	var right = createEl("td", { "class": "splitwindow_right", "rowspan": 2 }, row);
	var row2 = createEl("tr", false, table);
	var left = createEl("td", { "class": "splitwindow_left" }, row2);
	
	var that = {};
	that.currentidopen = false;
	
	// RESIZE MANAGEMENT
	prefs.addPref("sizes", { "name": "left_" + name, "defaultvalue": 200, "hidden": true });	
	left.style.width = prefs.getPref("sizes", "left_" + name) + "px";
	tabs_td.style.width = prefs.getPref("sizes", "left_" + name) + "px";
	
	var resize_mx;
	var resize_last_width = prefs.getPref("sizes", "left_" + name);
	var resize_final_width = resize_last_width;
	var maxwidth = container.offsetWidth;
	
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
		if (width < 150) width = 150;
		left.style.width = width + "px";
		tabs_td.style.width = width + "px";
		resize_final_width = width;
	};
	
	that.stopResize = function(e) {
		document.removeEventListener('mousemove', that.runningResize, true);
		document.removeEventListener('mouseup', that.stopColumnResize, true);
		prefs.changePref("sizes", "left_" + name, resize_final_width);
	};
	
	bar.addEventListener('mousedown', that.startResize, true);
	
	// TAB MANAGEMENT
	
	var currenttab = false;
	var tabs = {};
	var tabdivs = {};
	var tabul = createEl("ul", { "class": "splitwindow_tabs" }, tabs_td);
	
	that.addTab = function(key, title) {
		tabs[key] = createEl("li", { "class": "splitwindow_tab", "textContent": title }, tabul);
		tabs[key]._tabkey = key;
		tabs[key].addEventListener("click", that.switchToTab, true);
		tabdivs[key] = createEl("div", { "class": "splitwindow_leftcontainer" });
		if (!currenttab) {
			currenttab = key;
			left.appendChild(tabdivs[key]);
			tabs[key].className = "splitwindow_tab splitwindow_tab_active";
		}
		return tabdivs[key];
	};
	
	that.switchToTab = function(e) {
		left.removeChild(tabdivs[currenttab]);
		tabs[currenttab].className = "splitwindow_tab";
		currenttab = e.currentTarget._tabkey;
		left.appendChild(tabdivs[currenttab]);
		tabs[currenttab].className = "splitwindow_tab splitwindow_tab_active";
	};
	
	that.getTab = function(key) {
		if (tabs[key]) return tabs[key];
	};
	
	that.getTabDiv = function(key) {
		if (tabdivs[key]) return tabdivs[key];
	};
	
	// OTHER
	
	that.setHeight = function(height) {
		table.style.height = height + "px";
		var divh = table.offsetHeight - tabs_td.offsetHeight;
		for (var i in tabdivs) {
			tabdivs[i].style.height = divh + "px";
		}
	};
	
	// DIV MANAGEMENT

	var opendivs = [];
	
	that.isAnyDivOpen = function() {
		if (opendivs.length > 0) return true;
		return false;
	};
	
	that.createOpenDiv = function(type, id) {
		while (opendivs.length > 9) {
			if (typeof(opendivs[0].destruct) == "function") {
				opendivs[0].destruct();
			}
			that.removeOpenDiv(opendivs[0]);
			opendivs.shift();
		}
		for (i = 0; i < opendivs.length; i++) {
			opendivs[i].div.style.display = "none";
		}
		var div = document.createElement("div");
		div.setAttribute("class", "pl_opendiv");
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
				if (typeof(opendivs[0].destruct) == "function") {
					opendivs[0].destruct();
				}
				right.removeChild(div);
				opendivs.splice(opendivs.length - 1, 1);
			}
		}
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