function EdiMPI() {
	this.ytype = "slack";
	this.height = 0;
	this.minheight = 0;
	this.width = 0;
	this.minwidth = 0;
	this.title = "Multiple Panel Interface Base Object";
	this.mpi = true;
	this.mpikey = "base";

	edi.panels['EdiMPI'] = new EdiPanel(new EdiMPI(), "EdiMPI");
EdiMPI.prototype = {
	init: function() {
		this.width = this.container.offsetWidth;
		this.height = this.container.offsetHeight;
		this.panels = new Array();
		this.focused = false;
		this.bkg = false;
		this.panelsroom = (theme.MPI_MenuHeight + theme.MPI_MenuYPad);
		this.draw();
		this.tabs = new R3Tabs(this.container, this.container.offsetWidth);
		this.addPanel("PlaylistPanel", "");
		this.addPanel("LogPanel", "");
		this.focusPanel("PlaylistPanel", "");
	},
	
	divPositionAndSize: function(el) {
		el.setAttribute("style", "z-index: 2; position: absolute; width: " + this.width + "px; top: " + this.panelsroom + "px; height: " + (this.height - this.panelsroom) + "px;");
	},
	
	addPanel: function(panelname, params) {
		if (typeof(this.panels[panelname]) != "undefined") {
			this.focusPanel(panelname, params);
		}
		//try {
			eval("this.panels[panelname] = new " + panelname + "()");
			log.log("MPI", 0, "Initializing " + panelname);
			this.panels[panelname].container = document.createElement("div");
			this.panels[panelname].container.setAttribute("id", "Panel_" + panelname);
			var divtop = (theme.MPI_MenuHeight + theme.MPI_MenuYPad);
			this.divPositionAndSize(this.panels[panelname].container);
			this.panels[panelname].container.style.top = "-5000px";
			this.container.appendChild(this.panels[panelname].container);
			this.panels[panelname].init();
			this.panels[panelname].title = this.panels[panelname].title;
			this.tabs.addItem(panelname, this.panels[panelname].title);
			this.tabs.panels[panelname].focused = false;
			this.tabs.panels[panelname].el.addEvent('click', this.focusPanel.bind(this, panelname));
		/*}
		catch(err) {
			log.log("MPI", 0, "Failed to initialize " + panelname);
			return;
		}*/
	},
	
	focusPanel: function(panelname, params) {
		if (this.focused == panelname) return;
		if (this.focused) {
			this.panels[this.focused].container.style.top = "-5000px";
			this.tabs.panels[this.focused].focused = false;
			this.tabs.focusTab(this.focused);
		}
		this.focused = panelname;
		this.panels[this.focused].container.style.top = this.panelsroom + "px";
		this.tabs.panels[this.focused].focused = true;
		this.tabs.focusTab(this.focused);
	},
	
	openPanelLink: function(panel, link) {
		if (typeof(this.panels[panel]) != "undefined") {
			this.panels[panel].openLink(link);
			return true;
		}
		return false;
	}
}
