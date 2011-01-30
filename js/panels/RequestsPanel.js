panels.RequestsPanel = {
	ytype: "slack",
	height: svg.em * 2,
	minheight: svg.em * 2,
	xtype: "fit",
	width: svg.em * 20,
	minwidth: svg.em * 8,
	title: _l("p_RequestsPanel"),
	intitle: "RequestsPanel",
	
	constructor: function(edi, container) {
		var that = {};
		var list = RequestList(true);
		var line = AllRequestList();
		
		that.container = container;
		
		that.init = function() {
			container.style.overflow = "auto";
			container.appendChild(line.el);
			container.appendChild(list.el);
			
			ajax.addCallback(that, list.update, "requests_user");
			ajax.addCallback(that, line.update, "requests_all");
			
			initpiggyback['requests'] = "true";
			if (ajax.sync_time > 0) {
				ajax.async_get("requests_get", {});
			}
			
			help.addStep("managingrequests", { "h": "managingrequests", "p": "managingrequests_p", "skipf": function() { edi.openPanelLink("RequestsPanel", false); } });
			if (edi.mpi) {
				help.addStep("timetorequest", { "h": "timetorequest", "p": "timetorequest_p", "pointel": [ edi.tabs.panels["RequestsPanel"].el ] });
			}
			help.addToTutorial("request", [ "managingrequests", "timetorequest" ]);
		};

		return that;
	}
}

var AllRequestList = function() {
	var that = {};
	that.el = document.createElement("ol");
	that.el.setAttribute("class", "allrequestlist");
	var line = [];
	
	that.update = function(json) {
		var i = 0;
		var j = 0;
		var found = false;
		var newreq = false;
		for (i = 0; i < json.length; i++) {
			found = false;
			for (j = 0; j < line.length; j++) {
				if (json[i].request_id == line[j].p.request_id) {
					that.updateLi(line[j], json[i]);
					found = true;
				}
			}
			if (!found) {
				var newli = that.makeLi(json[i]);
				that.el.appendChild(newli.el);
				line.push(newli);
			}
		}
		
		for (j = 0; j < line.length; j++) {
			found = false;
			for (i = 0; i < json.length; i++) {
				if (json[i].request_id == line[j].p.request_id) found = true;
			}
			if (!found) {
				that.removeLi(line[j]);
				line.splice(j, 1);
			}
		}
	};
	
	that.makeLi = function(json) {
		var li = {};
		li.el = document.createElement("li");
		li.username = document.createElement("span");
		li.username.textContent = json.request_username;
		li.el.appendChild(li.username);
		that.updateLi(li, json);
		return li;
	};
	
	that.updateLi = function(li, json) {
		li.p = json;
		var expiry = 0;
		if ((json.request_expires_at > 0) && (json.request_tunedin_expiry > 0)) {
			expiry = json.request_expires_at < json.request_tunedin_expiry ? json.request_expires_at : json.request_tunedin_expiry;
		}
		else if (json.request_expires_at > 0) expiry = json.request_expires_at;
		else if (json.request_tunedin_expiry > 0) expiry = json.request_tunedin_expiry;
		if ((expiry > 0) && (!li.expires_on)) {
			li.expires_on = document.createElement("span");
			li.expires_on.setAttribute("class", "request_expires_on");
			if (expiry > clock.now) li.expires_on.textContent = " (expires in " + formatHumanTime(expiry - clock.now, true, true) + ")";
			else li.expires_on.textContent = " (expires next request fulfillment)";
			li.el.appendChild(li.expires_on);
		}
		else if ((expiry > 0) && (li.expires_on)) {
			if (expiry > clock.now) li.expires_on.textContent = " (expires in " + formatHumanTime(expiry - clock.now, true, true) + ")";
			else li.expires_on.textContent = " (expires next request fulfillment)";
		}
		else if (li.expires_on) {
			li.el.removeChild(li.expires_on);
			delete(li.expires_on);
		}
	};
	
	that.removeLi = function(li) {
		that.el.removeChild(li.el);
	};
	
	return that;
};

var RequestList = function(sortable) {
	var that = {};
	that.el = document.createElement("div");
	that.el.setAttribute("class", "requestlist");
	var maxy = 0;
	var dragging = false;
	var draggingid = -1;
	var dragthreshup = 0;
	var dragthreshdown = 0;
	var dragel = false;
	var dragidx = 0;
	var dragmouseoffset = 0;
	var reqs = [];
	var elposition = 0;
	var origdragidx = 0;

	that.update = function(json) {
		that.stopDrag();
		that.p = json;
		var i = 0;
		var j = 0;
		var found = false;
		var newreq;
		for (i = 0; i < json.length; i++) {
			found = false;
			for (j = 0; j < reqs.length; j++) {
				if (json[i].requestq_id == reqs[j].p.requestq_id) {
					found = true;
					reqs[j].update(json[i]);
					if (reqs[j].fx_opacity.now != 1) reqs[j].fx_opacity.start(1);
				}
			}
			if (!found) {
				newreq = Request.make(json[i]);
				newreq.purge = false;
				newreq.fx_posY = fx.make(fx.CSSNumeric, [ newreq.el, 250, "marginTop", "px" ]);
				newreq.fx_posY.set(0);
				newreq.fx_opacity = fx.make(fx.CSSNumeric, [ newreq.el, 250, "opacity", "" ]);
				newreq.fx_opacity.set(0);
				if (sortable) {
					newreq.el.requestq_id = json[i].requestq_id;
					newreq.el.addEventListener('mousedown', that.startDrag, true);
				}
				reqs.push(newreq);
				that.el.appendChild(newreq.el);
				newreq.fx_opacity.start(1);
			}
		}
		
		maxy = 0;
		var reqid;
		for (j = 0; j < reqs.length; j++) {
			reqid = reqs[j].p.requestq_id;
			found = false;
			for (var i = 0; i < json.length; i++) {
				if (json[i].requestq_id == reqs[j].p.requestq_id) found = true;
			}
			if (!found) {
				reqs[j].destruct();
				reqs[j].purge = true;
				reqs[j].fx_opacity.start(0);
			}
			else if (j < (reqs.length - 1)) {
				maxy += reqs[j].el.offsetHeight + 3;
			}
		}
		
		reqs.sort(that.sortRequestArray);
		that.positionReqs();
		
		if (sortable && (reqs.length > 0)) {
			help.changeStepPointEl("managingrequests", [ reqs[reqs.length - 1].el ]);
		}
		else {	
			help.changeStepPointEl("managingrequests", [ ]);
		}
	};
	
	that.purgeRequests = function() {
		for (var i = 0; i < reqs.length; i++) {
			if (reqs[i].purge) {
				that.el.removeChild(reqs[i].el);
				reqs.splice(i, 1);	
			}
		}
	};
	
	that.positionReqs = function(nopurge) {
		var runy = 0;
		var runz = 0;
		for (var i = 0; i < reqs.length; i++) {
			reqs[i].p.requestq_order = i;
			if (reqs[i].purge) {
				// nothing
			}
			else if (reqs[i].p.requestq_id == draggingid) {
				runy += reqs[i].el.offsetHeight + 3;
				runz += 1;
			}
			else {
				reqs[i].el.style.zIndex = runz;
				reqs[i].fx_posY.start(runy);
				reqs[i].desty = runy;
				runy += reqs[i].el.offsetHeight + 3;
				runz += 1;
			}
		}
		that.el.style.height = runy + "px";
		if (!nopurge) setTimeout(that.purgeRequests, 250);
	};
	
	that.startDrag = function(e) {
		// find out what drag index we're using
		dragidx = -1;
		for (var i = 0; i < reqs.length; i++) {
			if (reqs[i].p.requestq_id == e.currentTarget.requestq_id) {
				dragidx = i;
				draggingid = reqs[i].p.requestq_id;
				dragel = reqs[i].el;
				break;
			}
		}
		if (dragidx == -1) return;
		origdragidx = dragidx;
		reqs[dragidx].fx_opacity.start(0.6);
		reqs[dragidx].el.style.zIndex = reqs.length + 1;
		elposition = help.getElPosition(that.el)["y"];
		dragmouseoffset = getMousePosY(e) - elposition - reqs[dragidx].fx_posY.now;
		that.figureDragValues();
		document.getElementById("body").addEventListener("mousemove", that.runDrag, true);
		document.getElementById("body").addEventListener("mouseup", that.stopDrag, true);
		dragging = true;
	};
	
	that.figureDragValues = function() {
		dragthreshup = -10;
		if (dragidx > 0) {
			dragthreshup = reqs[dragidx - 1].desty + Math.round(reqs[dragidx - 1].el.offsetHeight / 2);
		}
		dragthreshdown = that.el.offsetHeight + 100;
		if (dragidx < reqs.length - 1) {
			dragthreshdown = reqs[dragidx + 1].desty + Math.round(reqs[dragidx + 1].el.offsetHeight / 3);
		}
	};
	
	that.runDrag = function(e) {
		var mousey = getMousePosY(e) - elposition - dragmouseoffset;
		if (mousey > maxy) mousey = maxy;
		if (mousey < 0) mousey = 0;
		reqs[dragidx].fx_posY.set(mousey);
		if (mousey < dragthreshup) {
			var r = reqs.splice(dragidx - 1, 2);
			reqs.splice(dragidx - 1, 0, r[1], r[0]);
			dragidx--;
			that.positionReqs(true);
			that.figureDragValues();
		}
		else if ((mousey + reqs[dragidx].el.offsetHeight) > dragthreshdown) {
			var r = reqs.splice(dragidx, 2);
			reqs.splice(dragidx, 0, r[1], r[0]);
			dragidx++;
			that.positionReqs(true);
			that.figureDragValues();
		}
	};
	
	that.stopDrag = function(e) {
		if (!dragging) return;
		document.getElementById("body").removeEventListener("mousemove", that.runDrag, true);
		document.getElementById("body").removeEventListener("mouseup", that.stopDrag, true);
		dragging = false;
		dragel = false;
		draggingid = -1;
		if (origdragidx == dragidx) {
			dragidx = -1;
			return;
		}
		dragidx = -1;
		var params = "";
		reqs.sort(that.sortRequestArray);
		that.positionReqs();
		for (var i = 0; i < reqs.length; i++) {
			if (i > 0) params += ",";
			params += reqs[i].p.requestq_id;
		}
		ajax.async_get("requests_reorder", { "order": params });
	};
	
	that.sortRequestArray = function(a, b) {
		if (a.p.song_available && !b.p.song_available) return -1;
		else if (!a.p.song_available && b.p.song_available) return 1;
		if (!a.p.song_available && !b.p.song_available) {
			if (a.p.song_releasetime < b.p.song_releasetime) return -1;
			else if (a.p.song_releasetime > b.p.song_releasetime) return 1;
		}
		if (a.p.requestq_order < b.p.requestq_order) return -1;
		else if (a.p.requestq_order > b.p.requestq_order) return 1;
		if (a.p.requestq_id < b.p.requestq_id) return -1;
		else if (a.p.requestq_id > b.p.requestq_id) return 1;
		return 0;
	};

	return that;
};

var Request = {
	linkify: function(song_id, el) {
		el.style.cursor = "pointer";
		el.addEventListener('click', function() { if (user.p.radio_tunedin) ajax.async_get("request", { "song_id": song_id }); else errorcontrol.doError(3002); }, true);
	},
	
	linkifyDelete: function(requestq_id, el) {
		el.style.cursor = "pointer";
		el.addEventListener('click', function(e) { hotkey.stopBubbling(e); ajax.async_get("request_delete", { "requestq_id": requestq_id }); }, true);
	},
	
	make: function(json) {
		var that = {};
		that.el = document.createElement("div");
		
		//theme.Extend.Request(that);
		//that.draw();
		
		/*that.songrating_svg = svg.make({ "width": theme.Rating_width, "height": svg.em * 1.4 });
		that.songrating_svg.setAttribute("class", "request_songrating");
		that.songrating = Rating({ category: "song", id: json.song_id, userrating: json.song_rating_user, x: 0, y: 1, siterating: json.song_rating_avg, favourite: json.song_favourite, register: true });
		that.songrating_svg.appendChild(that.songrating.el);
		that.el.appendChild(that.songrating_svg);*/
		
		that.song_title = document.createElement("div");
		that.song_title.setAttribute("class", "request_song_title");
		
		that.xbutton = document.createElement("span");
		that.xbutton.textContent = "X";
		that.xbutton.setAttribute("class", "request_xbutton");
		Request.linkifyDelete(json.requestq_id, that.xbutton);
		that.song_title.appendChild(that.xbutton);
		
		that.song_title_text = document.createElement("span");
		that.song_title_text.setAttribute("class", "request_song_title_text");
		that.song_title_text.textContent = json.song_title;
		Song.linkify(json.song_id, that.song_title_text);
		that.song_title_text.addEventListener("click", hotkey.stopBubbling, true);
		that.song_title.appendChild(that.song_title_text);
		
		that.el.appendChild(that.song_title);
		
		/*that.albumrating_svg = svg.make({ "width": theme.Rating_width, "height": svg.em * 1.4 });
		that.albumrating_svg.setAttribute("class", "request_albumrating");
		that.albumrating = Rating({ category: "album", id: json.album_id, userrating: json.album_rating_user, x: 0, y: 1, siterating: json.album_rating_avg, favourite: json.album_favourite, register: true });
		that.albumrating_svg.appendChild(that.albumrating.el);
		that.el.appendChild(that.albumrating_svg);*/
		
		that.album_name = document.createElement("div");
		that.album_name.setAttribute("class", "request_album_name");
		that.album_name_text = document.createElement("span");
		that.album_name_text.textContent = json.album_name;
		that.album_name.appendChild(that.album_name_text);
		Album.linkify(json.album_id, that.album_name_text);
		that.album_name.addEventListener("click", hotkey.stopBubbling, true);
		that.el.appendChild(that.album_name);
		
		that.update = function(json) {
			that.p = json;
			/*if (json.request_expires_at > 0) {
				that.expires_on = document.createElement("div");
				that.expires_on.setAttribute("class", "request_expires_on");
				that.expires_on.textContent = "Expires in " + formatHumanTime(json.request_expires_at - clock.now, true, true);
				that.el.appendChild(that.expires_on);
			}
			else if (that.expires_on) {
				that.el.removeChild(that.expires_on);
				delete(that.expires_on);
			}*/
			that.el.setAttribute("class", "request request_" + json.song_available);
			if ((json.song_available == false) && (!that.cooldown)) {
				that.cooldown = document.createElement("div");
				that.cooldown.setAttribute("class", "request_cooldown");
				that.cooldown.textContent = _l("oncooldownfor", { "cooldown": formatHumanTime(json.song_releasetime - clock.now, true, true) });
				that.el.appendChild(that.cooldown);
			}
			else if (json.song_available == false) {
				that.cooldown.textContent = _l("oncooldownfor", { "cooldown": formatHumanTime(json.song_releasetime - clock.now, true, true) });
			}
			else if (that.cooldown) {
				that.el.removeChild(that.cooldown);
				delete(that.cooldown);
			}
		};
		
		that.destruct = function() {
			// pass
		};
		
		that.update(json);
		
		return that;
	},
	
	sortRequests: function(a, b) {
		return 1;
	}
}
