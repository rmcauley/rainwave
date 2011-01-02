panels.MainMPI = {
	ytype: "max",
	height: 0,
	minheight: 0,
	width: 0,
	minwidth: 0,
	xtype: "max",
	title: "Tabbed Panel",
	mpi: true,
	mpikey: "main",
	intitle: "MainMPI",
	
	constructor: function(edi, container) {
		var that = {};
		var showlog = false;
		var savedpanels = {};	// saved panels that should be open in the MPI
		var startpanels = {};	// panels that should be opened on initialization
		var lastpanel = "blarghlarg";
		that.mpi = true;
		that.panels = {};
		that.focused = false;
		that.bkg = false;
		that.panelsroom = theme.MPI_MenuHeight + theme.MPI_MenuYPad;
		that.tabs = false;
		that.container = container;
		var ucallbackid = false;

		theme.Extend.MainMPI(that);

		that.init = function() {
			that.panels = {};
			that.draw();
			that.tabs = theme.TabBar(container, container.offsetWidth);
			
			for (var i in savedpanels) {
				that.addPanel(i);
			}
			var startfocused = false;
			for (var i in startpanels) {
				if (savedpanels[i]) {
					that.initPanel(i, false);
					if (!startfocused) {
						that.focusPanel(i, true);
						startfocused = true;
					}
				}
			}
			// odd place for a pref, maybe, but the log panel should load after everything else
			prefs.addPref("mpi", { name: "showlog", callback: that.p_showlog, defaultvalue: false, type: "checkbox", dsection: "edi" });
			if (showlog) {
				that.addPanel("LogPanel");
				if (startpanels.LogPanel) that.initPanel("LogPanel", false);
			}
			if (startpanels[lastpanel]) that.focusPanel(lastpanel);
		};
		
		that.divPositionAndSize = function(el) {
			el.setAttribute("style", "z-index: 2; position: absolute; width: " + container.offsetWidth + "px; top: " + that.panelsroom + "px; height: " + (container.offsetHeight - that.panelsroom) + "px;");
		};
		
		that.addPanel = function(panelname) {
			if (!panels[panelname]) return;
			var panel = panels[panelname];
			if (typeof(that.tabs.panels[panel.intitle]) != "undefined") {
				//that.focusPanel(panel.intitle);
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
				log.log("MPI", 0, "Failed to initialize " + panelname);
				return;
			}*/
		};
		
		that.initPanel = function(panelname, animate) {
			var panel = panels[panelname];
			if (that.panels[panel.intitle]) return;
			that.panels[panel.intitle] = {};
			log.log("MPI", 0, "Initializing " + panel.intitle);
			var mpi_container = document.createElement("div");
			var panelcl = panel.intitle;
			panelcl = panelcl.replace(" ", "_");
			mpi_container.className = "EdiPanel Panel_" + panelcl;
			that.panels[panel.intitle] = panel.constructor(that, mpi_container);
			that.divPositionAndSize(mpi_container);
			that.panels[panel.intitle].container.style.top = "-5000px";
			container.appendChild(mpi_container);
			that.panels[panel.intitle].init();
			//if (that.panels[panel.intitle].onLoad) that.panels[i].onLoad();
			that.panels[panel.intitle].title = panels[panel.intitle].title;
			that.tabs.enableTab(panel.intitle, animate);
		};
		
		that.focusPanelEvent = function(evt) {
			if (evt.target.panelname) that.focusPanel(evt.target.panelname);
		};
		
		that.focusPanel = function(panelname, nosave) {
			if (that.focused == panelname) return;
			if (!that.panels[panelname]) that.initPanel(panelname, true);
			if (!startpanels[panelname]) {
				startpanels[panelname] = true;
				prefs.changePref("mpi", "startpanels", startpanels);
			}
			if (!nosave) {
				prefs.changePref("mpi", "lastpanel", panelname);
			}
			if (that.focused) {
				that.panels[that.focused].container.style.top = "-5000px";
				that.tabs.panels[that.focused].focused = false;
				that.tabs.focusTab(that.focused);
			}
			that.focused = panelname;
			that.panels[that.focused].container.style.top = that.panelsroom + "px";
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
		
		that.p_showlog = function(nshowlog) {
			showlog = nshowlog;
			if (nshowlog && that.tabs.panels && !that.tabs.panels[panels.LogPanel.intitle]) {
				that.addPanel(panels.LogPanel.intitle);
			}
		};
		
		that.p_savedpanels = function(nsavedpanels) {
			savedpanels = nsavedpanels;
		};
		
		that.p_startpanels = function(nstartpanels) {
			startpanels = nstartpanels;
		};
		
		that.p_lastpanel = function(nlastpanel) {
			lastpanel = nlastpanel;
		}

		savedpanels =  { "PlaylistPanel": true, "RequestsPanel": true, "PrefsPanel": true, "SchedulePanel": true };
		//prefs.addPref("mpi", { name: "savedpanels", callback: that.p_savedpanels, defaultvalue: { "PlaylistPanel": true, "RequestsPanel": true, "PrefsPanel": true, "SchedulePanel": true, "HelpPanel": true }, hidden: true });
		prefs.addPref("mpi", { name: "startpanels", callback: that.p_startpanels, defaultvalue: {}, hidden: true });
		prefs.addPref("mpi", { name: "lastpanel", callback: that.p_lastpanel, defaultvalue: {}, hidden: true });

		return that;
	}
};
