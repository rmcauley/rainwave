panels.PrefsPanel = {
	ytype: "slack",
	height: UISCALE * 2,
	minheight: UISCALE * 2,
	xtype: "slack",
	width: UISCALE * 20,
	minwidth: UISCALE * 8,
	title: _l("p_PrefsPanel"),
	cname: "prefs",
	
	constructor: function(container) {
		var stables = {};
		var that = {};
		var displaying = {};
		that.container = container;
		container.style.overflow = "auto";
		
		that.init = function() {
			var i, k;
			for (i in prefs.p) {
				for (k in prefs.p[i]) {
					if (prefs.p[i][k].type && !displaying["pref_" + i + "_" + k]) that.newPrefCallback(i, prefs.p[i][k]);
				}
			}
		};
		
		that.newPrefCallback = function(section, prefdata) {
			if (prefdata.hidden) return;
			var tr = document.createElement("tr");
			var td = document.createElement("td");
			td.textContent = _l("pref_" + section + "_" + prefdata.name) + ": ";
			td.setAttribute("class", "pref_label");
			tr.appendChild(td);
			td = document.createElement("td");
			td.setAttribute("class", "pref_option");
			displaying["pref_" + section + "_" + prefdata.name] = true;
			if (prefdata.type == "checkbox") {
				var cb = document.createElement("input");
				cb.setAttribute("type", "checkbox");
				cb.setAttribute("name", "pref_" + section + "_" + prefdata.name);
				if (prefdata.value) cb.checked = true;
				else cb.checked = false;
				cb.addEventListener("click", that.prefCheckboxChange, true);
				td.appendChild(cb);
				prefs.addPrefCallback(section, prefdata.name, function(v) { cb.checked = v; });
			}
			else if (prefdata.type == "dropdown") {
				var select = document.createElement("select");
				select.setAttribute("name", "pref_" + section + "_" + prefdata.name);
				var opt;
				for (var i = 0; i < prefdata.options.length; i++) {
					opt = document.createElement("option");
					opt.setAttribute("value", prefdata.options[i].value);
					opt.textContent = prefdata.options[i].option;
					select.appendChild(opt);
				}
				that.dropdownMatch(select, prefdata.value);
				prefs.addPrefCallback(section, prefdata.name, function(v) { that.dropdownMatch(select, v); });
				select.addEventListener("change", that.prefDropdownChange, true);
				td.appendChild(select);
			}
			else if (prefdata.type == "button") {
				var button = createEl("button", { "textContent": _l("pref_" + section + "_" + prefdata.name + "_button") }, td);
				button.addEventListener("click", function() { prefs.changePref(section, prefdata.name, true); }, true);
			}
			tr.appendChild(td);
			/*td = document.createElement("td");
			td.setAttribute("class", "pref_third");
			if (prefdata.refresh) {
				td.textContent = _l("pref_refreshrequired");
			}
			else {
				td.textContent = " ";
			}
			tr.appendChild(td);*/
			if (prefdata.dsection) {
				if (!stables[prefdata.dsection]) that.newSectionCallback(prefdata.dsection);
				stables[prefdata.dsection].appendChild(tr);
			}
			else {
				if (!stables[section]) that.newSectionCallback(section);
				stables[section].appendChild(tr);
			}
		};
		
		that.dropdownMatch = function(select, value) {
			if (!select) return;
			for (var i = 0; i < select.options.length; i++) {
				if (select.options[i].value == value) select.selectedIndex = i;
			}
		};
		
		that.prefCheckboxChange = function(e) {
			if (!e.target) return;
			var data = e.target.getAttribute("name").split("_", 3);
			prefs.changePref(data[1], data[2], e.target.checked);
		};
		
		that.prefDropdownChange = function(e) {
			if (!e.target) return;
			var data = e.target.getAttribute("name").split("_", 3);
			prefs.changePref(data[1], data[2], e.target[e.target.selectedIndex].value);
		};
		
		that.newSectionCallback = function(section) {
			if (stables[section]) return;
			var tbl = createEl("table", { "class": "pref_table" }, container);
			var row = createEl("tr", false, tbl);
			createEl("th", { "textContent": _l("pref_" + section), "colspan": 2 }, row);
			stables[section] = tbl;
		};
		
		prefs.addNewPrefCallback(that, that.newPrefCallback);
		prefs.addPref("edi", { name: "wipeall", defaultvalue: false, type: "button", refresh: true });
		
		return that;
	}
}
