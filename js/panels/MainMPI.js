panels.MainMPI = {
	ytype: "max",
	height: 0,
	minheight: 0,
	width: 0,
	minwidth: 0,
	xtype: "max",
	title: _l("p_MainMPI"),
	mpi: true,
	mpikey: "main",
	intitle: "MainMPI",
	
	constructor: function(edi, container) {
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
		
		var pos = 0;
		var num = 0;
		var total = 0;
		var technicalhint = false;
		var no1requestsid = 0;

		theme.Extend.MainMPI(that);

		that.init = function() {
			that.panels = {};
			that.tabs = theme.TabBar(container, container.offsetWidth);
			
			for (var i in savedpanels) {
				that.addPanel(i);
			}
			
			// we needs tabs to have contents to measure the tab height, which is why we delay drawing and sizing divs until this point
			that.tabheight = that.tabs.el.offsetHeight;
			that.postDraw();

			if (lastpanel && panels[lastpanel]) {
				that.focusPanel(lastpanel);
			}
			
			user.addCallback(that, that.updateRequestPos, "radio_request_position");
			ajax.addCallback(that, that.updateRequestNum, "requests_user");
			ajax.addCallback(that, that.updateRequestTitle, "sched_sync");
		};
		
		that.divSize = function(el) {
			el.style.width = container.offsetWidth + "px";
			el.style.height = (container.offsetHeight - that.tabheight) + "px";
		};
		
		that.divPosition = function(el) {
			el.style.top = that.tabheight + "px";
		};
		
		that.addPanel = function(panelname) {
			if (!panels[panelname]) return;
			var panel = panels[panelname];
			if (typeof(that.tabs.panels[panel.intitle]) != "undefined") {
				return;
			}
			//try {
				that.tabs.addItem(panel.intitle, panel.title);
				that.tabs.panels[panel.intitle].focused = false;
				that.tabs.panels[panel.intitle].el.panelname = panel.intitle;
				that.tabs.panels[panel.intitle].el.addEventListener('click', that.focusPanelEvent, true);
				//if (panel.intitle == "PlaylistPanel") help["playlist"] = that.tabs.panels[panel.intitle].el;
			/*}
			catch(err) {
				return;
			}*/
		};
		
		that.initPanel = function(panelname, animate) {
			var panel = panels[panelname];
			if (that.panels[panel.intitle]) return;
			that.panels[panel.intitle] = {};
			var mpi_container = createEl("div", { "style": "z-index: 2; position: absolute;" });
			var panelcl = panel.intitle;
			panelcl = panelcl.replace(" ", "_");
			mpi_container.className = "EdiPanel Panel_" + panelcl;
			that.panels[panel.intitle] = panel.constructor(that, mpi_container);
			that.panels[panel.intitle].container.style.top = "-5000px";
			container.appendChild(mpi_container);
			that.panels[panel.intitle].init();
			that.divSize(that.panels[panel.intitle].container);
			//if (that.panels[panel.intitle].onLoad) that.panels[i].onLoad();
			that.panels[panel.intitle].title = panels[panel.intitle].title;
			that.tabs.enableTab(panel.intitle, animate);
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
			if (!that.tabs || !that.tabs.panels[panels.RequestsPanel.intitle]) return;
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
				if (total == 0) str = "";
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
			that.changeTitle(panels.RequestsPanel.intitle, panels.RequestsPanel.title + str);
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

		savedpanels =  { "PlaylistPanel": true, "RequestsPanel": true, "PrefsPanel": true, "SchedulePanel": true };
		//prefs.addPref("mpi", { name: "savedpanels", callback: that.p_savedpanels, defaultvalue: { "PlaylistPanel": true, "RequestsPanel": true, "PrefsPanel": true, "SchedulePanel": true, "HelpPanel": true }, hidden: true });
		prefs.addPref("mpi", { name: "lastpanel", callback: that.p_lastpanel, defaultvalue: {}, hidden: true });
		prefs.addPref("requests", { name: "technicalhint", defaultvalue: false, type: "checkbox", callback: that.p_technicalhint });

		return that;
	}
};
