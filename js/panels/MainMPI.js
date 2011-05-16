panels.MainMPI = {
	ytype: "max",
	height: 0,
	minheight: 0,
	width: 0,
	minwidth: 0,
	xtype: "max",
	mpi: true,
	title: _l("p_MainMPI"),
	
	constructor: function(container) {
		var that = {};
		var savedpanels = {};	// saved panels that should be open in the MPI
		var lastpanel = false;
		that.mpi = true;
		that.panels = {};
		that.focused = false;
		that.bkg = false;
		that.tabs = false;
		that.container = container;
		var ucallbackid = false;
		var containerheight = 0;
		
		var pos = 0;
		var num = 0;
		var total = 0;
		var technicalhint = false;
		var no1requestsid = 0;

		theme.Extend.MainMPI(that);

		that.init = function() {
			containerheight = container.offsetHeight;
			that.panels = {};
			that.tabs = theme.TabBar(container);
			
			for (var i in savedpanels) {
				that.addPanel(i);
			}
			
			// we needs tabs to have contents to measure the tab height, which is why we delay drawing and sizing divs until this point
			that.tabheight = that.tabs.el.offsetHeight;
			that.postDraw();

			if (lastpanel && panels[lastpanel] && savedpanels[lastpanel]) {
				that.focusPanel(lastpanel);
			}
			
			user.addCallback(that.updateRequestPos, "radio_request_position");
			lyre.addCallback(that.updateRequestNum, "requests_user");
			lyre.addCallback(that.updateRequestTitle, "requests_user");
		};
		
		that.onHeightResize = function(height) {
			containerheight = height;
			for (var i in that.panels) {
				if (typeof(that.panels[i].onHeightResize) == "function") that.panels[i].onHeightResize(height);
			}
		};
		
		that.onWidthResize = function(width) {
			for (var i in that.panels) {
				if (typeof(that.panels[i].onWidthResize) == "function") that.panels[i].onWidthResize(height);
			}
		};
		
		that.divSize = function(el) {
			el.style.height = (containerheight - that.tabheight) + "px";
		};
		
		that.divPosition = function(el) {
			el.style.top = that.tabheight + "px";
		};
		
		that.addPanel = function(panelname) {
			if (!panels[panelname]) return;
			var panel = panels[panelname];
			if (typeof(that.tabs.panels[panelname]) != "undefined") {
				return;
			}
			try {
				that.tabs.addItem(panelname, panel.title);
				that.tabs.panels[panelname].focused = false;
				that.tabs.panels[panelname].el.panelname = panelname;
				that.tabs.panels[panelname].el.addEventListener('click', that.focusPanelEvent, true);
			}
			catch(err) {
				errorcontrol.jsError(err);
				return;
			}
		};
		
		that.initPanel = function(panelname, animate) {
			var panel = panels[panelname];
			if (that.panels[panelname]) return;
			that.panels[panelname] = {};
			var mpi_container = createEl("div", { "style": "z-index: 2; position: absolute;" });
			var panelcl = panelname;
			panelcl = panelcl.replace(" ", "_");
			mpi_container.className = "EdiPanel Panel_" + panelcl;
			that.panels[panelname] = panel.constructor(mpi_container);
			that.panels[panelname].container.style.top = "-5000px";
			that.panels[panelname].container.style.width = "100%";
			container.appendChild(mpi_container);
			that.panels[panelname].parent = that;
			that.divSize(that.panels[panelname].container);
			that.panels[panelname].init();
			that.panels[panelname].title = panels[panelname].title;
			that.tabs.enableTab(panelname, animate);
		};
		
		that.focusPanelEvent = function(evt) {
			if (evt.target.panelname) that.focusPanel(evt.target.panelname);
		};
		
		that.focusPanel = function(panelname) {
			if (that.focused == panelname) return;
			if (!that.panels[panelname]) that.initPanel(panelname, true);
			prefs.changePref("mpi", "lastpanel", panelname);
			if (that.focused) {
				that.panels[that.focused].container.style.top = "-5000px";
				that.tabs.panels[that.focused].focused = false;
				that.tabs.focusTab(that.focused);
			}
			that.focused = panelname;
			that.panels[that.focused].container.style.top = that.tabheight + "px";
			that.tabs.panels[that.focused].focused = true;
			that.tabs.focusTab(that.focused);
		};
		
		that.changeTitle = function(panelname, newtitle) {
			that.tabs.changeTitle(panelname, newtitle);
		};
		
		that.openPanelLink = function(panel, link) {
			if (that.panels[panel] || savedpanels[panel]) {
				that.focusPanel(panel);
				if (that.panels[panel].openLink) that.panels[panel].openLink(link);
				return true;
			}
			return false;
		};
		
		that.updateRequestTitle = function() {
			if (!that.tabs || !that.tabs.panels["RequestsPanel"]) return;
			var str = "";
			if (technicalhint) {
				var numstring = "";
				numstring += num;
				if (total != num) numstring += "/" + total;
				var stationstring = "";
				if (no1requestsid != user.p.sid) stationstring = SHORTSTATIONS[no1requestsid] + " ";
				if (pos > 0) str = _l("reqtechtitlefull", { "position": pos, "requestcount": numstring, "station": stationstring });
				else if ((num > 0) || (total > 0)) str = _l("reqtechtitlesimple", { "requestcount": numstring, "station": stationstring });
			}
			else {
				var str = "";
				if (user.p.radio_request_expiresat) str = _l("reqexpiring");
				else if (total == 0) str = "";
				else if (no1requestsid != user.p.sid) str = _l("reqwrongstation");
				else if (user.p.radio_request_expiresat && (num == 0)) str = _l("reqexpiring");
				else if ((num == 0) & (total > 0)) str = _l("reqoncooldown");
				else if ((num == 0) && user.p.radio_request_position) str = _l("reqempty");
				else if (user.p.radio_request_position == 0) str = _l("reqfewminutes");
				else if (user.p.radio_request_position > 10) str = _l("reqlongwait");
				else if (user.p.radio_request_position > 6) str = _l("reqwait");
				else if (user.p.radio_request_position > 3) str = _l("reqshortwait");
				else str = _l("reqsoon");
			}
			that.changeTitle("RequestsPanel", panels.RequestsPanel.title + str);
		};
		
		that.updateRequestPos = function(newpos) {
			pos = newpos;
		};
		
		that.updateRequestNum = function(json) {
			num = 0;
			total = 0;
			for (var i = 0; i < json.length; i++) {
				if (json[i].song_available) num++;
				total++;
			};
			if (json.length > 0) no1requestsid = json[0].sid;
			else no1requestsid = user.p.sid;
		};
		
		that.p_technicalhint = function(techhint) {
			technicalhint = techhint;
			that.updateRequestTitle();
		}
		
		that.p_savedpanels = function(nsavedpanels) {
			savedpanels = nsavedpanels;
		};

		that.p_lastpanel = function(nlastpanel) {
			lastpanel = nlastpanel;
		}

		savedpanels =  { "PlaylistPanel": true, "RequestsPanel": true, "ListenersPanel": true, "PrefsPanel": true, "SchedulePanel": true };
		//prefs.addPref("mpi", { name: "savedpanels", callback: that.p_savedpanels, defaultvalue: { "PlaylistPanel": true, "RequestsPanel": true, "PrefsPanel": true, "SchedulePanel": true, "HelpPanel": true }, hidden: true });
		prefs.addPref("mpi", { name: "lastpanel", callback: that.p_lastpanel, defaultvalue: {}, hidden: true });
		prefs.addPref("requests", { name: "technicalhint", defaultvalue: false, type: "checkbox", callback: that.p_technicalhint });

		return that;
	}
};
