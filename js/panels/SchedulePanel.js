panels.SchedulePanel = {
	ytype: "fit",
	height: svg.em * 24,
	minheight: svg.em * 16,
	xtype: "fit",
	width: svg.em * 24,
	minwidth: svg.em * 16,
	title: "Schedule",
	intitle: "SchedulePanel",
	
	constructor: function(edi, container) {
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
			user.addCallback(that, that.djAdminChange, "radio_live_admin");
			
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
			
			newfs.appendChild(tbl);
			container.appendChild(newfs);
			
			initpiggyback['live'] = "true";
			ajax.addCallback(that, that.listUpdate, "live_shows");
			if (ajax.sync_on) {
				ajax.async_get("get_live_shows", {});
			}
			ajax.addCallback(that, that.liveTimerResync, "sched_current");
			ajax.addCallback(that, that.liveStartResult, "live_start_result");
			ajax.addCallback(that, that.liveEndResult, "live_end_result");
			ajax.addCallback(that, that.liveDeleteResult, "live_delete_result");
			ajax.addCallback(that, that.liveNewResult, "live_new_result");
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
			ajax.async_get("live_new", "epochtime=" + fdt + "&name=" + form_name.value + "&notes=" + form_notes.value + "&user_id=" + form_user_id.value + "&type=" + typ + "&length=" + form_length.value);
		};
		
		that.startPause = function() {
			ajax.async_get("live_new", "epochtime=0&name=Pause&notes=&user_id=" + user.p.user_id + "&type=" + SCHED_PAUSE + "&length=0");
		};
		
		that.endPause = function() {
			ajax.async_get("livedelete", "sched_id=0");
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
			list = document.createElement("table");
			var row;
			var date;
			var del;
			var start;
			var end;
			var td;
			for (var i = 0; i < json.length; i++) {
				row = document.createElement("tr");
				date = new Date(json[i].sched_starttime * 1000);
				row.appendChild(createEl("td", { "textContent": date.toString() + ": " + json[i].sched_name + " -- " + json[i].username + " // " + json[i].sched_notes } ));
				td = document.createElement("td");
				if (user.p.radio_live_admin >= 2) {
					del = createEl("button", { "textContent": _l("delete") });
					del.sched_id = "" + json[i].sched_id;
					del.addEventListener("click", function() { ajax.async_get("live_delete", "sched_id=" + del.sched_id); }, true);
					td.appendChild(del);
				}
				if ((json[i].user_id == user.p.user_id) && (json[i].sched_type == SCHED_LIVE)) {
					start = createEl("button", { "textContent": _l("start") });
					start.sched_id = "" + json[i].sched_id;
					start.addEventListener("click", function() { ajax.async_get("live_start", "sched_id=" + start.sched_id); }, true);
					td.appendChild(start);
					end = createEl("button", { "textContent": _l("end") });
					end.sched_id = "" + json[i].sched_id;
					end.addEventListener("click", function() { ajax.async_get("live_end", "sched_id=" + end.sched_id); }, true);
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