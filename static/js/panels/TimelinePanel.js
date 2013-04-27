panels.TimelinePanel = {
	ytype: "fit",
	height: UISCALE * 40,
	minheight: UISCALE * 40,
	xtype: "fit",
	width: UISCALE * 40,
	minwidth: UISCALE * 35,
	maxwidth: 600,
	title: _l("p_TimelinePanel"),
	cname: "timeline",
	
	constructor: function(container) {
		var that = {};
		that.container = container;
		that.allevents = [];
		that.nextevents = [];
		that.currentevents = [];
		that.lastevents = [];
		that.new_ux_sched_id = 0;
		
		var hidingx = 0;

		theme.Extend.TimelinePanel(that);
		
		that.init = function() {
			container.style.overflow = "hidden";
			
			that.height = container.offsetHeight;
			that.width = container.offsetWidth;

			that.currentendtime = 0;
			that.draw();
			
			lyre.addCallback(that.purgeEvents, "sched_presync");
			lyre.addCallback(that.currentHandle, "sched_current");
			lyre.addCallback(that.nextHandle, "sched_next");
			lyre.addCallback(that.historyHandle, "sched_history");
			lyre.addCallback(that.positionEvents, "sched_sync");
			lyre.addCallback(that.voteResultHandle, "vote_result");
			
			user.addCallback(that.activityAllowedChange, "current_activity_allowed");
			
			help.addStep("clickonsongtovote", { "h": "clickonsongtovote", "p": "clickonsongtovote_p", "modx": (UISCALE * 2) });
			help.addStep("donevoting", { "h": "donevoting", "p": "donevoting_p" });
			help.addTutorial("voting", [ "tunein", "clickonsongtovote" ]);
			help.addTopic("voting", { "h": "voting", "p": "voting_p", "tutorial": "voting" });
		};
		
		that.onHeightResize = function(height) {
			that.height = height;
		};
		
		that.onWidthResize = function(width) {
			that.width = width;
		};
		
		that.convertJsonArray = function(json) {
			var na = [];
			for (var i = 0; i < json.length; i++) {
				na.push(Schedule.r4translate(json[i]));
			}
			return na;
		};
		
		that.purgeEvents = function(json) {
			json = that.convertJsonArray(json);
		
			var i = 0;
			while (i < that.allevents.length) {
				if (that.allevents[i].purge == true) {
					that.allevents[i].purgeElements();
					container.removeChild(that.allevents[i].el);
					that.allevents.splice(i, 1);
				}
				else {
					//that.allevents[i].purge = true;
					i++;
				}
			}
		};
		
		that.setPurgeFlags = function(albums) {
			var foundidx, i, j;
			for (i = 0; i < albums.length; i++) {
				for (j = 0; j < that.currentevents.length; j++) {
					if (that.currentevents[j].p.sched_id == albums[i].p.sched_id) foundidx = true;
				}
				if (!foundidx) albums[i].purge = true;
			}
		}
		
		that.updateEventData = function(json) {
			if (!json) return;
			// JSON is already translated at this point
			var i, j, foundidx, added;
			var catarray = [];
			for (i = 0; i < json.length; i++) {
				foundidx = -1;
				for (j = 0; j < that.allevents.length; j++) {
					if (that.allevents[j].p.sched_id == json[i].sched_id) foundidx = j;
				}
				if (foundidx == -1) {
					added = that.addEvent(json[i]);
					if (added) {
						added.purge = false;
						catarray.push(added);
						that.allevents.push(added);
					}
				}
				else {
					that.allevents[foundidx].update(json[i]);
					that.allevents[foundidx].purge = false;
					catarray.push(that.allevents[foundidx]);
				}
			}
			return catarray;
		};
		
		that.historyHandle = function(json) {
			if (!json) return;
			json = that.convertJsonArray(json);
			
			if (json) {
				that.setPurgeFlags(that.lastevents);
				that.lastevents = that.updateEventData(json);
			}
			for (var i = 0; i < that.lastevents.length; i++) {
				if (i == 0) that.lastevents[i].showHeader();
				else that.lastevents[i].hideHeader();
				that.lastevents[i].disableVoting();
				that.lastevents[i].clockRemove();
				if (user.p.current_activity_allowed && that.lastevents[i].p.user_wastunedin) {
					that.lastevents[i].enableRating();
				}
				else {
					that.lastevents[i].disableRating();
				}
				that.lastevents[i].showSongLengths();
				that.lastevents[i].showWinner();
				that.lastevents[i].recalculateHeight();
				that.lastevents[i].changeHeadline(_l("previouslyplayed"));
				// this will squish the previously played results together into a neat block
				that.lastevents[i].height -= 4;
			}
		};
		
		that.currentHandle = function(json) {
			if (!json) return;
			json = Schedule.r4translate(json);
		
			if (json) {
				that.setPurgeFlags(that.currentevents);
				that.currentevents = that.updateEventData([ json ]);
				that.currentendtime = json.sched_endtime;
			}
			for (var i = 0; i < that.currentevents.length; i++) {
				if (user.p.current_activity_allowed) {
					that.currentevents[i].enableRating();
				}
				else {
					that.currentevents[i].disableRating();
				}
				that.currentevents[i].clockRemove();
				that.currentevents[i].disableVoting();
				that.currentevents[i].showVotes();
				that.currentevents[i].sortSongOrder();
				that.currentevents[i].changeHeadline(_l("nowplaying"));
				that.currentevents[i].updateIndicator();
			}
		};
		
		that.nextHandle = function(json) {
			if (!json) return;
			json = that.convertJsonArray(json);
		
			if (json) {
				that.setPurgeFlags(that.nextevents);
				that.nextevents = that.updateEventData(json);
			}
			var crossedelec = false;
			for (var i = 0; i < that.nextevents.length; i++) {
				that.nextevents[i].disableRating();
				if (user.p.current_activity_allowed && ((i == 0) || user.p.radio_perks)) {
					that.nextevents[i].enableVoting();
				}
				else {
					that.nextevents[i].disableVoting();
				}
				if (!crossedelec && that.nextevents[i].p.sched_type == SCHED_ELEC) {
					crossedelec = true;
					if (that.nextevents[i].updateVotingHelp) that.nextevents[i].updateVotingHelp();
				}
			}
		};
		
		that.voteResultHandle = function(json) {
			if ((json.code != 700) && ("entry_id" in json)) {
				for (var i = 0; i < that.allevents.length; i++) {
						if (that.allevents[i].p.sched_id == json.elec_id) {
								that.allevents[i].registerFailedVote(json.entry_id);	
						}		
				}
				
			}
			else if (json.code == 700) {
				for (var i = 0; i < that.allevents.length; i++) {
						if (that.allevents[i].p.sched_id == json.elec_id) {
								that.allevents[i].registerVote(json.entry_id);
						// that.allevents[i].disableVoting();
						}
				}
			}
		};
		
		that.activityAllowedChange = function(allowed) {
			that.historyHandle();
			that.currentHandle();
			that.nextHandle();
		};

		that.addEvent = function(json) {
			var newobj = false;
			if (json.sched_type == SCHED_ELEC) newobj = TimelineElection(json, container, that);
			else if (json.sched_type == SCHED_LIVE) newobj = TimelineLiveShow(json, container, that);
			else if (json.sched_type == SCHED_ADSET) newobj = TimelineAdSet(json, container, that);
			else if (json.sched_type == SCHED_PLAYLIST) newobj = TimelinePlaylist(json, container, that);
			else if (json.sched_type == SCHED_ONESHOT) newobj = TimelineOneShot(json, container, that);
			if (newobj) {
				newobj.init();
				newobj.el.style.position = "absolute";
				container.appendChild(newobj.el);
			}
			return newobj;
		};
	
		that.positionEvents = function() {
			var i;
			if (!that.showelec && !that.showhistory && !that.showallnext) {
				that.positionOneEvent();
				hidingx = true;
			}
			else {
				if (hidingx) {
					for (i = 0; i < that.allevents.length; i++) {
						that.allevents[i].moveXTo(0);
					}
				}
				hidingx = false;
				that.positionEventsLinear();
			}
		};
		
		that.afterHeightResize = that.positionEvents;
		
		that.positionOneEvent = function() {
			// if we're animating off a change of mode switch
			if (hidingx === false) {
				// move events to the top
				that.currentevents[0].moveTo(0);
				that.nextevents[0].moveTo(0);
				// move all next events off screen
				for (i = 1; i < that.nextevents.length; i++) {
					that.nextevents[i].moveTo(-that.nextevents[i].height - 5);
				}
				// move all last events off screen
				for (i = 0; i < that.lastevents.length; i++) {
					that.lastevents[i].moveTo(that.height);
				}
			}
			else {
				that.currentevents[0].setY(0);
				that.nextevents[0].setY(0);
				if (that.new_ux_sched_id != that.currentevents[0].p.sched_id) {
					that.nextevents[0].hideX();
				}
			}
			that.new_ux_sched_id == that.currentevents[0].p.sched_id;
			that.currentevents[0].moveXTo(that.container.offsetWidth);
			that.currentevents[0].changeOpacity(0);
			that.nextevents[0].moveXTo(0);
		};
		
		that.positionEventsLinear = function() {
			/*1. 1st election
			  2. 1st history
			  3. Now playing
			  4. 2nd election
			  5. More history */

			var i, moveto;
			for (i = 0; i < that.allevents.length; i++) {
				that.allevents[i].timep_showing = false;
				if (that.allevents[i].purge) {
					that.allevents[i]._move_to_y = that.height;
					that.allevents[i].remove();
				}
			}
			var ybudget = that.height;
			var ybudgetused = 0;
			var crossedelec  = false;
			var ymargin = 5;
			
			// Until I comment otherwise, the following section of code solves which events should be showing
			
			// in the following blocks of code, i keeps track of next event index and j for history
			i = 0;
			while (!crossedelec && (i < that.nextevents.length) && ((that.nextevents[i].height + ybudgetused + ymargin) <= ybudget)) {
				that.nextevents[i].timep_showing = true;
				ybudgetused += that.nextevents[i].height + ymargin;
				if (that.nextevents[i].p.sched_type == SCHED_ELEC) {
					crossedelec = true;
				}
				i++;
			}
			
			var j = 0;
			if (that.showhistory && that.lastevents[0] && ((that.lastevents[0].height + ybudgetused + ymargin) <= ybudget)) {
				j = 1;
				ybudgetused += that.lastevents[0].height + ymargin;
				that.lastevents[0].timep_showing = true;
			}
			
			if (that.showelec && that.currentevents[0] && ((that.currentevents[0].height + ybudgetused + ymargin) <= ybudget)) {
				ybudgetused += that.currentevents[0].height + ymargin;
				that.currentevents[0].timep_showing = true;
				that.currentevents[0].emphasizeWinner();
				that.currentevents[0].changeOpacity(1);
			}
			
			// the value for i is not reset here, we want to continue from where we left off the last time we calculated the loop
			crossedelec = false;
			while (that.showallnext && !crossedelec && (i < that.nextevents.length) && ((that.nextevents[i].height + ybudgetused + ymargin) <= ybudget)) {
				that.nextevents[i].timep_showing = true;
				ybudgetused += that.nextevents[i].height + ymargin;
				if (that.nextevents[i].p.sched_type == SCHED_ELEC) crossedelec = true;
				i++;
			}
			
			while (that.showhistory && (j < that.lastevents.length) && ((that.lastevents[j].height + ybudgetused + ymargin) <= ybudget)) {
				that.lastevents[j].timep_showing = true;
				ybudgetused += that.lastevents[j].height + ymargin;
				j++;
			}
			
			while (that.showallnext && (i < that.nextevents.length) && ((that.nextevents[i].height + ybudgetused + ymargin) <= ybudget)) {
				that.nextevents[i].timep_showing = true;
				ybudgetused += that.nextevents[i].height + ymargin;
				i++;
			}
			
			var runz = 0;
			var runy = 0;
			
			// Properly calculate the time until each event
			var runningsched = that.currentendtime;
			for (i = 0; i < that.nextevents.length; i++) {
				that.nextevents[i].clockChange(runningsched);
				runningsched += that.nextevents[i].getScheduledLength();
			}
			
			// The next block positions events, with a lot of horribly copy-pasted code
			
			for (i = that.nextevents.length - 1; i >= 0; i--) {
				if (that.nextevents[i].timep_showing) {
					that.nextevents[i].changeZ(runz);
					that.nextevents[i]._move_to_y = runy;
					runy += that.nextevents[i].height + ymargin;
					runz++;
				}
				else {
					that.nextevents[i]._move_to_y = -that.nextevents[i].height - 5;
				}
			}
			
			if (that.currentevents[0] && that.currentevents[0].timep_showing) {
				that.currentevents[0].changeZ(runz);
				that.currentevents[0]._move_to_y = runy;
				runy += that.currentevents[0].height + ymargin;
				runz++;
			}
			if (that.currentevents[0] && !that.currentevents[0].timep_showing) {
				that.currentevents[0]._move_to_y = -that.currentevents[0].height - 5;
			}

			var runopacity = .75;
			for (i = 0; i < that.lastevents.length; i++) {
				if (that.lastevents[i].timep_showing) {
					that.lastevents[i].changeZ(runz);
					that.lastevents[i]._move_to_y = runy;
					that.lastevents[i].changeOpacity(runopacity);
					runy += that.lastevents[i].height + ymargin;
					runz++;
					runopacity -= .07;
				}
				else {
					that.lastevents[i]._move_to_y = that.height + 5;
				}
			}
			
			for (i = 0; i < that.allevents.length; i++) {
				that.allevents[i].moveTo(that.allevents[i]._move_to_y);
			}
		};
		
		that.p_showelec = function(showelec) {
			if (SIDEBAR) showelec = true;
			that.showelec = showelec;
			if (that.allevents.length > 0) that.positionEvents();
		};
		
		that.p_showhistory = function(showhistory) {
			if (SIDEBAR) showhistory = true;
			that.showhistory = showhistory;
			if (that.allevents.length > 0) that.positionEvents();
		};
		
		that.p_showallnext = function(showallnext) {
			that.showallnext = showallnext;
			if (that.allevents.length > 0) that.positionEvents();
		};
		
		prefs.addPref("timeline", { name: "showallnext", defaultvalue: false, callback: that.p_showallnext, type: "checkbox" });
		prefs.addPref("timeline", { name: "showelec", defaultvalue: false, callback: that.p_showelec, type: "checkbox" });
		prefs.addPref("timeline", { name: "showhistory", defaultvalue: false, callback: that.p_showhistory, type: "checkbox" });
		prefs.addPref("timeline", { "name": "highlightrequests", "defaultvalue": true, "type": "checkbox" });
		
		return that;
	}
};

function TimelineSkeleton(json, container, parent) {
	var that = {};

	that.purge = false;
	that.el = false;
	that.p = json;
	that.clockdisplay = false;
	that.clockid = false;
	that.container = container;
	that.parent = parent;
	that.height = 0;
	that.timeleft = 0;
	
	theme.Extend.TimelineSkeleton(that);

	that.init = function() {
		that.draw();
		that.container.appendChild(that.el);
		that.clockdisplay = true;
		that.clockid = -1;
		if (that.p.sched_used == 0) {
			that.clockid = clock.addClock(that.el, that.clockUpdate, that.p.sched_starttime, -2);
		}
		that.recalculateHeight();
	};
	
	that.update = function(newjson) {
		that.p = newjson;
	};
	
	that.purgeElements = function() {
		//if (that.clockid >= 0) clock.eraseClock(that.clockid);
	};

	that.clockRemove = function() {
		if (that.clockdisplay) {
			that.clockdisplay = false;
			that.clockUndraw();
		}
	};
	
	that.clockChange = function(newend) {
		clock.updateClockEnd(that.clockid, newend);
	};

	that.clockUpdate = function(time) {
		that.timeleft = time;
		if ((that.clockdisplay) && (time >= 0)) that.clock.textContent = formatNumberToMSS(time);
	};
	
	that.updateIndicator = function() {
		if (that.p.song_data && (typeof(that.p.song_data[0].elec_isrequest) != "undefined")) {
			if (that.p.song_data[0].elec_isrequest > ELECSONGTYPES.normal) that.changeIndicator("request");
			else if (that.p.song_data[0].elec_isrequest < ELECSONGTYPES.normal) that.changeIndicator("conflict");
			else that.changeIndicator("normal");
		}
		else {
			that.changeIndicator("normal");
		}
	};
	
	that.getScheduleLength = function() { return 0; }	
	that.remove = function() {};
	that.showWinner = function() {};
	that.showVotes = function() {};
	that.showSongLengths = function() {};
	that.enableVoting = function() {};
	that.disableVoting = function() {};
	that.cancelVoting = function() {};	
	that.updateVotingHelp = function() {};
	that.enableRating = function() {};	
	that.disableRating = function() {};
	that.registerVote = function() {};
	that.registerFailedVote = function() {};

	return that;
};
	
function TimelineElection(json, container, parent) {
	var that = TimelineSkeleton(json, container, parent);
	
	that.songs = new Array();
	that.showingwinner = false;
	that.votingdisabled = true;
	that.voted = false;
	
	theme.Extend.TimelineSkeleton(json, container, parent);
	theme.Extend.TimelineElection(that);

	that.init = function() {
		that.draw();
		that.container.appendChild(that.el);

		for (var sn = 0; sn < json.song_data.length; sn++) {
			that.songs[sn] = TimelineSong(json.song_data[sn], that, 0, UISCALE + (sn * theme.TimelineSong_height), sn);
		}
		
		that.clockdisplay = true;
		that.clockid = -1;
		if (that.p.sched_used == 0) {
			that.clockid = clock.addClock(that.el, that.clockUpdate, that.p.sched_starttime, -2);
		}
		that.recalculateHeight();
	};
	
	that.update = function(newjson) {
		if ((that.p.sched_used == 0) && (newjson.sched_used == 2)) {
			for (var j = 0; j < that.songs.length; j++) {
				that.songs[j].songnum = 10;
			}
			for (var i = 0; i < newjson.song_data.length; i++) {
				for (var j = 0; j < that.songs.length; j++) {
					if (that.songs[j].p.song_id == newjson.song_data[i].song_id) {
						that.songs[j].songnum = newjson.song_data[i].elec_position;
						that.songs[j].updateJSON(newjson.song_data[i]);
					}
				}
			}
			that.songs.sort(that.sortSongs);
		}
		that.p = newjson;
	};
	
	that.enableRating = function() {
		that.songs[0].enableRating();
	};
	
	that.disableRating = function() {
		that.songs[0].disableRating();
	};
	
	that.showWinner = function() {
		if (that.showingwinner) return;
		that.showingwinner = true;
		that.drawShowWinner();
	};
	
	that.sortSongs = function(a, b) {
		if (a.songnum < b.songnum) return -1;
		else if (a.songnum > b.songnum) return 1;
		else return 0;
	};
	
	that.showVotes = function() {
		for (var i = 0; i < that.songs.length; i++) {
			that.songs[i].showVotes();
		}
		that.drawAsCurrent();
	};
	
	that.showSongLengths = function() {
		for (var i = 0; i < that.songs.length; i++) {
			that.songs[i].showSongLength();
		}
	};
	
	that.enableVoting = function() {
		if (!that.votingdisabled || that.voted) return;
		that.votingdisabled = false;
		for (var i = 0; i < that.songs.length; i++) {
			that.songs[i].enableVoting();
		}
	};
	
	that.disableVoting = function(override) {
		if (that.votingdisabled) return;
		that.votingdisabled = true;
		that.cancelVoting();
		for (var i = 0; i < that.songs.length; i++) {
			that.songs[i].disableVoting();
		}
	};

	that.cancelVoting = function() {
		for (var i = 0; i < that.songs.length; i++) {
			that.songs[i].voteCancel();
		}
	};
	
	that.registerFailedVote = function(elec_entry_id) {
		for (var i = 0; i < that.songs.length; i++) {
			if (that.songs[i].p.elec_entry_id == elec_entry_id) {
				that.songs[i].registerFailedVote();
				that.changeHeadline(_l("election"));
			}
		}
	};
	
	that.registerVote = function(elec_entry_id) {
		for (var i = 0; i < that.songs.length; i++) {
			if (that.songs[i].p.elec_entry_id == elec_entry_id) {
				that.songs[i].registerVote();
				that.voted = true;
				help.continueTutorialIfRunning("clickonsongtovote");
			}
			else {
				that.songs[i].voteCancel();
				that.songs[i].voteHoverOff();
			}
		}
		return that.voted;
	};
	
	that.updateVotingHelp = function() {
		var spe = [];
		for (var i = 0; i < that.songs.length; i++) {
			spe.push(that.songs[i].song_title);
		}
		help.changeStepPointEl("clickonsongtovote", spe);
		help.changeTopicPointEl("voting", spe);
	};
	
	that.getScheduledLength = function() {
		var avg = 0;
		for (var i = 0; i < that.songs.length; i++) {
			avg += that.songs[i].p.song_secondslong;
		}
		return Math.round(avg / that.songs.length);
	};

	return that;
};

function TimelineAdSet(json, container, parent) {
	var that = TimelineSkeleton(json, container, parent);
	theme.Extend.TimelineAdSet(that);
	
	that.getScheduledLength = function() {
		var total = 0;
		for (var i = that.p.adset_position; i < that.p.ad_data.length; i++) {
			total += that.p.ad_data[i].ad_secondslong;
		}
		return total;
	};
	
	return that;
}

function TimelineLiveShow(json, container, parent) {
	var that = TimelineSkeleton(json, container, parent);
	theme.Extend.TimelineLiveShow(that);
	
	that.getScheduledLength = function() {
		return that.p.sched_length;
	}
	
	return that;
};

function TimelinePlaylist(json, container, parent) {
	var that = TimelineSkeleton(json, container, parent);
	that.songs = new Array();
	theme.Extend.TimelinePlaylist(that);

	that.init = function() {
		that.draw();
		that.container.appendChild(that.el);

		for (var sn = 0; sn < json.song_data.length; sn++) {
			that.songs[sn] = TimelineSong(json.song_data[sn], that, 0, UISCALE + (sn * theme.TimelineSong_height), sn);
			that.el.appendChild(that.songs[sn].el);
		}
		
		that.clockdisplay = true;
		that.clockid = -1;
		if (that.p.sched_used == 0) {
			that.clockid = clock.addClock(that.el, that.clockUpdate, that.p.sched_starttime, -2);
		}
		that.recalculateHeight();
	};
	
	that.remove = function() {
		// nothing to do
	};
	
	that.getScheduledLength = function() {
		var total = 0;
		for (var i = 0; i < that.p.song_data.length; i++) {
			total += that.p.song_data[i].song_secondslong;
		}
		return total;
	};

	return that;
};

function TimelineOneShot(json, container, parent) {
	var that = TimelineSkeleton(json, container, parent);
	that.p = json;
	theme.Extend.TimelineOneShot(that);

	that.init = function() {
		that.draw();
		that.container.appendChild(that.el);
		that.song = TimelineSong(json.song_data[0], that, 0, UISCALE + 2, 0);
		that.songs = [ that.song ];		
		
		that.clockdisplay = true;
		that.clockid = -1;
		if (that.p.sched_used == 0) {
			that.clockid = clock.addClock(that.el, that.clockUpdate, that.p.sched_starttime, -2);
		}
		that.recalculateHeight();
	};
		
	that.enableRating = function() {
		that.song.enableRating();
	};
	
	that.disableRating = function() {
		that.song.disableRating();
	};
	
	that.remove = function() {
		// nothing to do
	};
	
	that.deleteOneShot = function() {
		if (that.p.user_id == user.p.user_id) {
			lyre.async_get("oneshot_delete", { "sched_id": that.p.sched_id });
		}
	};
	
	that.getScheduledLength = function() {
		return that.p.song_data[0].song_secondslong;
	};
	
	that.showWinner = function() {
		if (that.showingwinner) return;
		that.showingwinner = true;
		that.drawShowWinner();
	};

	return that;
};

function TimelineSong(json, parent, x, y, songnum) {
	var that = {};
	that.p = json;
	that.elec_votes = 0;
	that.songnum = songnum;
	that.voteinprogress = false;
	that.votesubmitted = false;
	that.votehighlighted = false;
	that.parent = parent;

	theme.Extend.TimelineSong(that);
	that.draw();
	Album.linkify(json.album_id, that.album_name);
	if (that.vote_hover_el) {
		that.vote_hover_el.addEventListener('mouseover', that.showRequestor, true);
		that.vote_hover_el.addEventListener('mouseout', that.hideRequestor, true);
	}
	
	that.updateJSON = function(json) {
		that.p = json;
		that.song_rating.updateSiteRating(that.p.song_rating_avg);
		that.album_rating.updateSiteRating(that.p.album_rating_avg);
	};
	
	that.enableVoting = function() {
		that.vote_hover_el.addEventListener('mouseover', that.voteHoverOn, true);
		that.vote_hover_el.addEventListener('mouseout', that.voteHoverOff, true);
		that.vote_hover_el.addEventListener('click', that.voteAction, true);
		that.vote_hover_el.style.cursor = "pointer";
	};
	
	that.disableVoting = function() {
		that.vote_hover_el.removeEventListener('mouseover', that.voteHoverOn, true);
		that.vote_hover_el.removeEventListener('mouseout', that.voteHoverOff, true);
		that.vote_hover_el.removeEventListener('click', that.voteAction, true);
		that.vote_hover_el.style.cursor = "default";
		if (!that.votehighlighted) that.voteHoverOff();
	};
	
	that.voteAction = function() {
		// if (that.voteinprogress) {
		that.voteSubmit();
		// return;
		// }
		// that.parent.cancelVoting();
		// if (parent.timeleft >= 15) {
			// that.voteinprogress = true;
			// that.startVoting();
		// }
		// else {
			// that.voteinprogress = true;
			// that.voteSubmit();
		// }
	};
	
	that.voteCancel = function() {
		//if (that.voteinprogress && !that.votesubmitted) {
			that.voteinprogress = false;
			that.votehighlighted = false;
			that.votesubmitted = false;
			// that.voteProgressStop();
			// that.voteProgressReset();
			that.voteHoverReset();
		//}
	};

	that.voteSubmit = function() {
		if (that.votesubmitted) return;
		that.votesubmitted = true;
		// that.voteProgressStop();
		that.voteProgressComplete();
		// that.parent.disableVoting();
		// that.parent.changeHeadline(_l("submittingvote"));
		lyre.async_get("vote", { "entry_id": that.p.elec_entry_id });
	};
	
	that.registerFailedVote = function() {
		that.voteinprogress = false;
		that.votesubmitted = false;
		that.votehighlighted = false;
		that.voteHoverReset();
		// that.voteHoverOff();
	};
	
	that.registerVote = function() {
		// that.voteinprogress = true;
		that.votesubmitted = true;
		that.votehighlighted = true;
		that.voteProgressComplete();
		that.registerVoteDraw();
		that.parent.changeHeadline(_l("voted"));
	};
	
	that.enableRating = function() {
		that.song_rating.enable();
		that.album_rating.enable();
	};
	
	that.disableRating = function() {
		that.song_rating.disable();
		that.album_rating.disable();
	};
	
	that.getScheduledLength = function() {
		return that.p.song_secondslong;
	};

	return that;
};
