panels.ListenersPanel = {
	ytype: "fit",
	height: 300,
	minheight: 300,
	xtype: "fit",
	width: 300,
	minwidth: 300,
	title: _l("p_ListenersPanel"),
	cname: "listeners",
	
	constructor: function(container) {
		var clistc;
		var guest_counter;
		var total_counter;
		var that = {};
		that.container = container;
		
		theme.Extend.ListenersPanel(that);
		
		that.initCListView = function(self) {
			initpiggyback['listeners_current'] = "true";
			lyre.sync_extra['listeners_current'] = "true";
			if (lyre.sync_time > 0) {
				lyre.async_get("listeners_current");
			}
		};
		
		// this gets redefined in that.init
		that.getCurrentTab = function() { return false; };

		that.init = function() {
			view = SplitWindow("listeners", container);
			clistc = view.addTab("clist", _l("ltab_listeners"), that.initCListView);
			view.initTabs();
			that.getCurrentTab = view.getCurrentTab;
			
			guest_counter = createEl("div", { "class": "clist_guest_count" }, clistc);
			total_counter = createEl("div", { "class": "clist_total_count" }, clistc);
			clist = ListenersSearchTable(that, clistc, view);
			
			lyre.addCallback(that.clistUpdate, "listeners_current");
			lyre.addCallback(that.drawListenerCallback, "listener_detail");
			
			that.onHeightResize(container.offsetHeight);
		};
		
		that.onHeightResize = function(height) {
			view.setHeight(height);
		};
		
		that.openLink = function(type, id) {
			if (type == "id") {
				that.openListener(id);
			}
			if (type == "id_refresh") { 
				that.openListener(id, true);
			}
		};
		
		that.clistUpdate = function(json) {
			clist.update(json.users);
			_l("otherlisteners", { "guests": json.guests, "total": (json.guests + json.users.length) }, guest_counter);
			_l("registeredlisteners", { "users": json.users.length }, total_counter);
		};
		
		that.drawListenerCallback = function(json) {
			var wdow = view.createOpenDiv("listener", json.user_id);
			that.drawListener(wdow, json);
			clist.navToID(json.user_id);
			if (typeof(wdow.updateHelp) == "function") wdow.updateHelp();
			return true;
		};
		
		that.openListener = function(user_id, force) {
			if (!force && (view.checkOpenDivs("listener", user_id))) {
				clist.navToID(user_id);
				return;
			}
			lyre.async_get("listener_detail", { "listener_uid": user_id });
		};
		
		return that;
	}
};

var ListenersSearchTable = function(parent, container, view) {
	var that = SearchTable(container, "user_id", "pl_albumlist");
	that.changeSearchKey("username");
	that.changeSortKey("radio_2wkvotes");
	that.changeReverseSort(true);
	
	that.syncdeletes = true;
	
	that.searchAction = function(id) {
		Username.open(id);
	};

	that.drawEntry = function(clist) {
		clist.name_td = createEl("td", { "textContent": clist.username, "class": "pl_al_name" }, clist.tr);
		clist.name_td.addEventListener('click', that.updateScrollOffsetByEvt, true);
		clist.votes_td = createEl("td", { "textContent": clist.radio_2wkvotes, "class": "pl_al_number" }, clist.tr);
		Username.linkify(clist.user_id, clist.name_td);
	};
	
	that.drawNavChange = function(artist, highlight) {
		if (!artist) return;
		var cl = "pl_available";
		if (highlight) cl += " pl_highlight";
		//if (artist.artist_id == parent.open_artist) cl += " pl_albumopen";
		artist.tr.setAttribute("class", cl);
	};
	
	that.drawUpdate = function(clist) {
		clist.votes_td.textContent = clist.radio_2wkvotes;
	};
	
	that.searchEnabled = function() {
		if ((parent.getCurrentTab() == 'clist') && parent.parent.mpi && (parent.parent.focused == "ListenersPanel")) return true;
		return false;
	};
	
	return that;
};
