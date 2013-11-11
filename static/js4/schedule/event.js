var Event = function() {
	var e_self = {};

	e_self.load = function(json) {
		if (json.type == "Election") {
			return Election(json);
		}
		else if (json.type == "OneUp") {
			return OneUp(json);
		}
		return null;
	}
	return e_self;
}();

var EventBase = function(json) {
	var self = {};
	self.data = json;
	self.id = json.id;
	self.type = json.type;
	self.length = json.length;
	self.end = json.end;
	self.pending_delete = false;
	self.name = null;
	self.height = null;
	self.el = null;
	self.elements = {};

	self.songs = [];
	if ("songs" in json) {
		for (var i = 0; i < json.songs.length; i++) {
			self.songs.push(Song(json.songs[i]));
		}
	}

	self.draw = function() {
		self.el = $el("div", { "class": "timeline_event timeline_" + self.type })
		self.elements.clock = $el("div", { "class": "timeline_clock" })
		self.elements.header = $el("div", { "class": "timeline_event_header"})
		Clock.add_clock(self.elements.clock, self.data.start);
	}

	self.update = function(json) {
		self.data.end = json.end;
		self.data.start = json.start;
		self.data.predicted_start = json.predicted_start;
		self.elements.clock._clock_end = self.data.predicted_start;
	}

	return self;
};

//
//	that.getScheduleLength = function() { return 0; }
//	that.remove = function() {};
//	that.showWinner = function() {};
//	that.showVotes = function() {};
//	that.showSongLengths = function() {};
//	that.enableVoting = function() {};
//	that.disableVoting = function() {};
//	that.cancelVoting = function() {};
//	that.updateVotingHelp = function() {};
//	that.enableRating = function() {};
//	that.disableRating = function() {};
//	that.registerVote = function() {};
//	that.registerFailedVote = function() {};
//
//	return that;
//};
//
//function TimelineElection(json, container, parent) {
//	var that = TimelineSkeleton(json, container, parent);
//
//	that.songs = new Array();
//	that.showingwinner = false;
//	that.votingdisabled = true;
//	that.voted = false;
//
//	theme.Extend.TimelineSkeleton(json, container, parent);
//	theme.Extend.TimelineElection(that);
//
//	that.init = function() {
//		that.draw();
//		that.container.appendChild(that.el);
//
//		for (var sn = 0; sn < json.song_data.length; sn++) {
//			that.songs[sn] = TimelineSong(json.song_data[sn], that, 0, UISCALE + (sn * theme.TimelineSong_height), sn);
//		}
//
//		that.clockdisplay = true;
//		that.clockid = -1;
//		if (that.p.sched_used == 0) {
//			that.clockid = clock.addClock(that.el, that.clockUpdate, that.p.sched_starttime, -2);
//		}
//		that.recalculateHeight();
//	};
//
//	that.update = function(newjson) {
//		if ((that.p.sched_used == 0) && (newjson.sched_used == 2)) {
//			for (var j = 0; j < that.songs.length; j++) {
//				that.songs[j].songnum = 10;
//			}
//			for (var i = 0; i < newjson.song_data.length; i++) {
//				for (var j = 0; j < that.songs.length; j++) {
//					if (that.songs[j].p.song_id == newjson.song_data[i].song_id) {
//						that.songs[j].songnum = newjson.song_data[i].elec_position;
//						that.songs[j].updateJSON(newjson.song_data[i]);
//					}
//				}
//			}
//			that.songs.sort(that.sortSongs);
//		}
//		that.p = newjson;
//	};
//
//	that.enableRating = function() {
//		that.songs[0].enableRating();
//	};
//
//	that.disableRating = function() {
//		that.songs[0].disableRating();
//	};
//
//	that.showWinner = function() {
//		if (that.showingwinner) return;
//		that.showingwinner = true;
//		that.drawShowWinner();
//	};
//
//	that.sortSongs = function(a, b) {
//		if (a.songnum < b.songnum) return -1;
//		else if (a.songnum > b.songnum) return 1;
//		else return 0;
//	};
//
//	that.showVotes = function() {
//		for (var i = 0; i < that.songs.length; i++) {
//			that.songs[i].showVotes();
//		}
//		that.drawAsCurrent();
//	};
//
//	that.showSongLengths = function() {
//		for (var i = 0; i < that.songs.length; i++) {
//			that.songs[i].showSongLength();
//		}
//	};
//
//	that.enableVoting = function() {
//		if (!that.votingdisabled || that.voted) return;
//		that.votingdisabled = false;
//		for (var i = 0; i < that.songs.length; i++) {
//			that.songs[i].enableVoting();
//		}
//	};
//
//	that.disableVoting = function(override) {
//		if (that.votingdisabled) return;
//		that.votingdisabled = true;
//		that.cancelVoting();
//		for (var i = 0; i < that.songs.length; i++) {
//			that.songs[i].disableVoting();
//		}
//	};
//
//	that.cancelVoting = function() {
//		for (var i = 0; i < that.songs.length; i++) {
//			that.songs[i].voteCancel();
//		}
//	};
//
//	that.registerFailedVote = function(elec_entry_id) {
//		for (var i = 0; i < that.songs.length; i++) {
//			if (that.songs[i].p.elec_entry_id == elec_entry_id) {
//				that.songs[i].registerFailedVote();
//				that.changeHeadline(_l("election"));
//			}
//		}
//	};
//
//	that.registerVote = function(elec_entry_id) {
//		for (var i = 0; i < that.songs.length; i++) {
//			if (that.songs[i].p.elec_entry_id == elec_entry_id) {
//				that.songs[i].registerVote();
//				that.voted = true;
//				help.continueTutorialIfRunning("clickonsongtovote");
//			}
//			else {
//				that.songs[i].voteCancel();
//				that.songs[i].voteHoverOff();
//			}
//		}
//		return that.voted;
//	};
//
//	that.updateVotingHelp = function() {
//		var spe = [];
//		for (var i = 0; i < that.songs.length; i++) {
//			spe.push(that.songs[i].song_title);
//		}
//		help.changeStepPointEl("clickonsongtovote", spe);
//		help.changeTopicPointEl("voting", spe);
//	};
//
//	that.getScheduledLength = function() {
//		var avg = 0;
//		for (var i = 0; i < that.songs.length; i++) {
//			avg += that.songs[i].p.song_secondslong;
//		}
//		return Math.round(avg / that.songs.length);
//	};
//
//	return that;
//};
//
//function TimelineAdSet(json, container, parent) {
//	var that = TimelineSkeleton(json, container, parent);
//	theme.Extend.TimelineAdSet(that);
//
//	that.getScheduledLength = function() {
//		var total = 0;
//		for (var i = that.p.adset_position; i < that.p.ad_data.length; i++) {
//			total += that.p.ad_data[i].ad_secondslong;
//		}
//		return total;
//	};
//
//	return that;
//}
//
//function TimelineLiveShow(json, container, parent) {
//	var that = TimelineSkeleton(json, container, parent);
//	theme.Extend.TimelineLiveShow(that);
//
//	that.getScheduledLength = function() {
//		return that.p.sched_length;
//	}
//
//	return that;
//};
//
//function TimelinePlaylist(json, container, parent) {
//	var that = TimelineSkeleton(json, container, parent);
//	that.songs = new Array();
//	theme.Extend.TimelinePlaylist(that);
//
//	that.init = function() {
//		that.draw();
//		that.container.appendChild(that.el);
//
//		for (var sn = 0; sn < json.song_data.length; sn++) {
//			that.songs[sn] = TimelineSong(json.song_data[sn], that, 0, UISCALE + (sn * theme.TimelineSong_height), sn);
//			that.el.appendChild(that.songs[sn].el);
//		}
//
//		that.clockdisplay = true;
//		that.clockid = -1;
//		if (that.p.sched_used == 0) {
//			that.clockid = clock.addClock(that.el, that.clockUpdate, that.p.sched_starttime, -2);
//		}
//		that.recalculateHeight();
//	};
//
//	that.remove = function() {
//		 nothing to do
//	};
//
//	that.getScheduledLength = function() {
//		var total = 0;
//		for (var i = 0; i < that.p.song_data.length; i++) {
//			total += that.p.song_data[i].song_secondslong;
//		}
//		return total;
//	};
//
//	return that;
//};
//
//function TimelineOneShot(json, container, parent) {
//	var that = TimelineSkeleton(json, container, parent);
//	that.p = json;
//	theme.Extend.TimelineOneShot(that);
//
//	that.init = function() {
//		that.draw();
//		that.container.appendChild(that.el);
//		that.song = TimelineSong(json.song_data[0], that, 0, UISCALE + 2, 0);
//		that.songs = [ that.song ];
//
//		that.clockdisplay = true;
//		that.clockid = -1;
//		if (that.p.sched_used == 0) {
//			that.clockid = clock.addClock(that.el, that.clockUpdate, that.p.sched_starttime, -2);
//		}
//		that.recalculateHeight();
//	};
//
//	that.enableRating = function() {
//		that.song.enableRating();
//	};
//
//	that.disableRating = function() {
//		that.song.disableRating();
//	};
//
//	that.remove = function() {
//		 nothing to do
//	};
//
//	that.deleteOneShot = function() {
//		if (that.p.user_id == user.p.user_id) {
//			lyre.async_get("oneshot_delete", { "sched_id": that.p.sched_id });
//		}
//	};
//
//	that.getScheduledLength = function() {
//		return that.p.song_data[0].song_secondslong;
//	};
//
//	that.showWinner = function() {
//		if (that.showingwinner) return;
//		that.showingwinner = true;
//		that.drawShowWinner();
//	};
//
//	return that;
//};
