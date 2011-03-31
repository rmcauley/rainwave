panels.SchedulePanel = {
	ytype: "slack",
	height: UISCALE * 30,
	minheight: UISCALE * 20,
	xtype: "slack",
	width: UISCALE * 30,
	minwidth: UISCALE * 20,
	title: _l("p_SchedulePanel"),
	
	constructor: function(container) {
		var that = {};
		that.container = container;
		var form_time;
		var form_name;
		var form_notes;
		var form_user_id;
		var form_djblock;
		var form_submit;
		var form_length;
		var schedule = document.createElement("table");
		schedule.setAttribute("class", "schedule_table");
		var list = document.createElement("table");
		var listfs = document.createElement("fieldset");
		listfs.appendChild(list);
		var djfs = document.createElement("fieldset");
		djfs.style.display = "none";
		var newfs = document.createElement("fieldset");
		newfs.style.display = "none";
		var livetimer = createEl("div", { "class": "live_timehelper" });
		livetimer.style.display = "none";
		var livetimerclock = false;
		var livetimernext = 0;
		var livetimeractual = 0;
		var goingonair = false;
		var postmixing = 0;
		var djblock = false;
		var onair = false;

		that.init = function() {
			that.container.appendChild(livetimer);
			
			var l;
			
			l = document.createElement("legend");
			l.textContent = _l("djadmin");
			djfs.appendChild(l);
			var startbtn = createEl("button", { "textContent": _l("pausestation") });
			var endbtn = createEl("button", { "textContent": _l("endpause") });
			startbtn.addEventListener("click", that.startPause, true);
			endbtn.addEventListener("click", that.endPause, true);
			djfs.appendChild(startbtn);
			djfs.appendChild(endbtn);
			container.appendChild(djfs);
			
			that.djAdminChange(user.p.radio_live_admin);
			user.addCallback(that.djAdminChange, "radio_live_admin");
			
			container.appendChild(schedule);
			container.appendChild(listfs);
		
			l = document.createElement("legend");
			l.textContent = _l("newliveshow");
			newfs.appendChild(l);
			var tbl = document.createElement("table");
			tbl.setAttribute("class", "pref_table");
			
			var row = document.createElement("tr");
			row.appendChild(createEl("td", { "textContent": _l("newliveexplanation"), "colspan": 2 }));
			tbl.appendChild(row);
			
			row = document.createElement("tr");
			row.appendChild(createEl("td", { "textContent": _l("time"), "style": "width: 18em;"}));
			var td = document.createElement("td");
			form_time = createEl("input", { "type": "text", "value": "0" });
			td.appendChild(form_time);
			var nowbutton = createEl("input", { "type": "button", "value": "Now" });
			nowbutton.addEventListener("click", function() { form_time.value = clock.now; }, true);
			td.appendChild(nowbutton);
			row.appendChild(td);
			tbl.appendChild(row);
			
			row = document.createElement("tr");
			row.appendChild(createEl("td", { "textContent": _l("name")}));
			td = document.createElement("td");
			form_name = createEl("input", { "type": "text", "value": "" });
			td.appendChild(form_name);
			row.appendChild(td);
			tbl.appendChild(row);
			
			row = document.createElement("tr");
			row.appendChild(createEl("td", { "textContent": _l("notes")}));
			td = document.createElement("td");
			form_notes = createEl("input", { "type": "text", "value": "" });
			td.appendChild(form_notes);
			row.appendChild(td);
			tbl.appendChild(row);
			
			row = document.createElement("tr");
			row.appendChild(createEl("td", { "textContent": _l("lengthinseconds")}));
			td = document.createElement("td");
			form_length = createEl("input", { "type": "text" }); //, "checked": "false" });
			td.appendChild(form_length);
			row.appendChild(td);
			tbl.appendChild(row);
			
			row = document.createElement("tr");
			row.appendChild(createEl("td", { "textContent": _l("user_id")}));
			td = document.createElement("td");
			form_user_id = createEl("input", { "type": "text", "value": user.p.user_id });
			td.appendChild(form_user_id);
			row.appendChild(td);
			tbl.appendChild(row);
			
			row = document.createElement("tr");
			row.appendChild(createEl("td", { "textContent": _l("djblock")}));
			td = document.createElement("td");
			form_djblock = createEl("input", { "type": "checkbox" });
			td.appendChild(form_djblock);
			row.appendChild(td);
			tbl.appendChild(row);
		
			row = document.createElement("tr");
			row.appendChild(createEl("td", { "textContent": ""}));
			td = document.createElement("td");
			form_submit = createEl("input", { "type": "submit", value: _l("addshow") });
			form_submit.addEventListener('click', that.submitNewShow, true);
			td.appendChild(form_submit);
			row.appendChild(td);
			tbl.appendChild(row);
			
			row = createEl("tr", {}, tbl);
			td = createEl("td", {}, row);
			var refresh_playlist = createEl("button", { "textContent": "Refresh Playlist" }, td);
			refresh_playlist.addEventListener('click', function() {
				lyre.async_get("admin_playlist_refresh");
			}, true);
			row.appendChild(createEl("td", { "textContent": ""}));
			
			newfs.appendChild(tbl);
			container.appendChild(newfs);
			
			initpiggyback['live'] = "true";
			lyre.addCallback(that.listUpdate, "live_shows");
			if (lyre.sync_time > 0) {
				lyre.async_get("live_shows", {});
			}
			
			lyre.addCallback(that.liveTimerResync, "sched_current");
			lyre.addCallback(that.liveStartResult, "event_start_result");
			lyre.addCallback(that.liveEndResult, "event_end_result");
			lyre.addCallback(that.liveDeleteResult, "event_delete_result");
			lyre.addCallback(that.liveNewResult, "event_add_result");
		};
		
		that.submitNewShow = function() {
			var typ = form_djblock.checked ? SCHED_DJ : SCHED_LIVE;
			var fdt = 0;
			if (form_time.value.match(/^\d+$/)) {
				fdt = form_time.value;
			}
			else if (form_time.value != 0) {
				var dt = new Date(form_time.value);
				fdt = Math.floor(dt.getTime() / 1000);
			}
			lyre.async_get("event_add", { "time": fdt, "name": form_name.value, "notes": form_notes.value, "user_id": form_user_id.value, "type": typ, "length": form_length.value });
		};
		
		that.startPause = function() {
			lyre.async_get("event_add", { "time": 0, "name": "Pause", "notes": "", "user_id": user.p.user_id, "type": SCHED_PAUSE, "length": 0 });
		};
		
		that.endPause = function() {
			lyre.async_get("event_delete", { "sched_id": 0 });
		};
		
		that.liveNewResult = function(json) {
			if ((json.code == 1) && (json.sched_type == SCHED_PAUSE)) {
				goingonair = true;
				djblock = true;
				postmixing = 0;
			}
		};
		
		that.liveStartResult = function(json) {
			if (json.code == 1) {
				goingonair = true;
				djblock = false;
				postmixing = 0;
			}
		};
		
		that.liveEndResult = function(json) {
			if (json.code == 1) {
				goingonair = false;
				postmixing = 2;
				onair = false;
			}
		};
		
		that.liveDeleteResult = function(json) {
			if ((json.code == 1) && (json.sched_id == 0)) {
				that.liveEndResult(json);
			}
		};
		
		that.listUpdate = function(json) {
			listfs.removeChild(list);
			if (json.length == 0) {
				list = createEl("div", { "textContent": _l("noschedule") });
				listfs.appendChild(list);
				return;
			}
			list = createEl("table", { "class": "schedule_table" });
			var row;
			var date;
			var del;
			var start;
			var end;
			var td;
			var minutes, minutese;
			for (var i = 0; i < json.length; i++) {
				row = document.createElement("tr");
				date = new Date(json[i].sched_starttime * 1000);
				enddate = new Date((json[i].sched_starttime + json[i].sched_length) * 1000);
				row.appendChild(createEl("td", { "textContent": STATIONS[json[i].sid] }));
				row.appendChild(createEl("td", { "textContent": date.toLocaleDateString() }));
				minutes = date.getMinutes();
				if (minutes < 10) minutes = "0" + minutes;
				minutese = enddate.getMinutes();
				if (minutese < 10) minutese = "0" + minutese;
				row.appendChild(createEl("td", { "textContent": date.getHours() + ":" + minutes + " - " + enddate.getHours() + ":" + minutese }));
				row.appendChild(createEl("td", { "textContent": json[i].sched_name }));
				row.appendChild(createEl("td", { "textContent": json[i].sched_notes }));
				row.appendChild(createEl("td", { "textContent": json[i].username }));
				td = document.createElement("td");
				if (user.p.radio_live_admin >= 2) {
					del = createEl("button", { "textContent": _l("delete") });
					del.sched_id = "" + json[i].sched_id;
					del.addEventListener("click", function() { lyre.async_get("event_delete", { "sched_id": del.sched_id }); }, true);
					td.appendChild(del);
				}
				if ((json[i].user_id == user.p.user_id) && (json[i].sched_type == SCHED_LIVE)) {
					start = createEl("button", { "textContent": _l("start") });
					start.sched_id = "" + json[i].sched_id;
					start.addEventListener("click", function() { lyre.async_get("event_start", { "sched_id": start.sched_id }); }, true);
					td.appendChild(start);
					end = createEl("button", { "textContent": _l("end") });
					end.sched_id = "" + json[i].sched_id;
					end.addEventListener("click", function() { lyre.async_get("event_end", { "sched_id": end.sched_id }); }, true);
					td.appendChild(end);
				}
				row.appendChild(td);
				list.appendChild(row);
			}
			listfs.appendChild(list);
		};
		
		that.djAdminChange = function(newadmin) {
			if (newadmin > 0) {
				djfs.style.display = "block";
				that.showLiveTimer(true);
			}
			else {
				djfs.style.display = "none";
				that.showLiveTimer(false);
			}
			if (newadmin > 1) newfs.style.display = "block";
			else newfs.style.display = "none";
		};
		
		that.showLiveTimer = function(show) {
			if (show) {
				livetimer.style.display = "block";
				if (!livetimerclock) livetimerclock = clock.addClock(that, that.liveTimerUpdate, livetimernext, -8);
			}
			else {
				livetimer.style.display = "false";
				if (livetimerclock) clock.eraseClock(livetimerclock);
				livetimerclock = false;
			}
		};
		
		that.liveTimerUpdate = function(ntime) {
			var tc = ntime + " ";
			if (onair) {
				if (ntime < 0) tc += _l("OVERTIME");
				else if (ntime <= 5) tc += _l("endnow");
				else if (ntime <= 60) tc += _l("wrapup");
				else tc += _l("onair");
			}			
			else if (goingonair) {
				if (ntime <= 0) tc += _l("onair");
				else if (ntime <= 5) tc += _l("connect");
				else if (ntime <= 10) tc += _l("mixingok");
				else if (ntime <= 15) tc += _l("getready"); 
				else tc += _l("standby");
			}
			else if (postmixing == 1) {
				var ago = clock.now - livetimeractual;
				if (ago <= 5) tc += _l("mixingok");
				else if (user.p.radio_live_admin == 0) that.showLiveTimer(false);
				else postmixing = 0;
			}
			else {
				if (ntime <= 0) tc += _l("HOLD");
				else tc += _l("dormant");
			}
			livetimer.textContent = tc;
		};
		
		that.liveTimerResync = function(json) {
			livetimernext = json['sched_endtime'];
			livetimeractual = json['sched_actualtime'];
			var update = false;
			if (json['user_id'] == user.p.user_id) { 
				update = true;
			}
			else if (user.p.radio_live_admin > 0) {
				update = true;
			}
			if (((json['sched_type'] == SCHED_ELEC) || (json['sched_type'] == SCHED_LIVE)) && update) {
				if ((json['sched_type'] == SCHED_LIVE) && (json['user_id'] == user.p.user_id)) { 
					onair = true;
				}
				if (postmixing > 0) postmixing--;
				if (livetimerclock) clock.updateClockEnd(livetimerclock, json['sched_endtime']);
			}
		};
		
		return that;
	}
};
