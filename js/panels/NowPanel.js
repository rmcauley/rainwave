panels.NowPanel = {
	ytype: "fit",
	height: 140,
	minheight: 140,
	xtype: "max",
	width: svg.em * 32,
	minwidth: svg.em * 32,
	title: "Now Playing",
	intitle: "NowPanel",
	
	initSizeX: function(x, colw) {
		if (colw > (svg.em * 60)) {
			return (svg.em * 60);
		}
		else if (x > (colw + 117)) {
			return (colw + 117)
		}
		return x;
	},
	
	constructor: function(edi, container) {
		var that = {};

		theme.Extend.NowPanel(that);
		that.evt = [ false, false ];
		that.svg;
		that.el;
		that.container = container;
	
		that.init = function() {
			that.width = container.offsetWidth;
			that.height = container.offsetHeight;
			that.svg = svg.make( { width: that.width, height: that.height } );
			container.appendChild(that.svg);
			that.el = that.svg;
			ajax.addCallback(that, that.ajaxHandle, "sched_current");
			that.draw();
			user.addCallback(that, that.ratableChange, "current_activity_allowed");
		};
		
		that.ajaxHandle = function(json) {
			var trip = false;
			if (!that.evt[1] || (json.sched_id != that.evt[1].p.sched_id)) trip = true;
			else if ((json.sched_type == SCHED_PLAYLIST) && (that.evt[1].p.sched_type == SCHED_PLAYLIST) && (json.playlist_position != that.evt[1].p.playlist_position)) trip = true;
			else if ((json.sched_type == SCHED_ADSET) && (that.evt[1].p.sched_type == SCHED_ADSET) && (json.adset_position != that.evt[1].p.adset_position)) trip = true;
			if (trip) {
				if (json.sched_type == SCHED_ELEC) that.evt[2] = NPElection(that, json);
				//else if (json.sched_type == SCHED_JINGLE) that.evt[2] = NPJingle(that, json);
				else if (json.sched_type == SCHED_LIVE) that.evt[2] = NPLiveShow(that, json);
				else if (json.sched_type == SCHED_ONESHOT) that.evt[2] = NPOneShot(that, json);
				else if (json.sched_type == SCHED_ADSET) that.evt[2] = NPAdSet(that, json);
				else if (json.sched_type == SCHED_PLAYLIST) that.evt[2] = NPPlaylist(that, json);
				if (user.p.current_activity_allowed == 1) that.evt[2].enableRating();
				if (that.evt[1]) that.evt[1].uninit();
				if (that.evt[0]) that.el.removeChild(that.evt[0].el);
				that.el.appendChild(that.evt[2].el);
				that.evt[2].init();
				that.changeHeader(json);
				that.evt.shift();
			}
		};
		
		that.ratableChange = function(ratable) {
			if (that.evt[1] != false) {
				if (ratable == 1) {
					that.evt[1].enableRating();
				}
				else {
					that.evt[1].disableRating();
				}
			}
		};
		
		return that;
	}
};

var NPElection = function(npp, json) {
	var that = {};
	that.el = svg.makeEl("g");
	that.p = json;
	
	theme.Extend.NPElection(that, npp);
	that.draw();
	
	help.changeStepPointEl("ratecurrentsong", [ that.songrating.grid ]);
	help.changeTopicPointEl("ratecurrentsong", [ that.songrating.grid ]);
	help.changeStepPointEl("setfavourite", [ that.songrating.favbutton ]);
	
	that.init = function() {
		that.animateIn();
	};
	
	that.uninit = function() {
		that.destruct();
		that.animateOut();
	};
	
	that.enableRating = function() {
		that.songrating.enable();
		that.albumrating.enable();
	};
	
	that.disableRating = function() {
		that.songrating.disable();
		that.albumrating.disable();
	};
	
	return that;
};

var NPJingle = function(npp, json) {
	var that = {};
	that.p = json;
	that.el = svg.makeEl("g");
	
	theme.Extend.NPJingle(that, npp);
	that.draw();
	
	help.changeStepPointEl("ratecurrentsong", false);
	help.changeTopicPointEl("ratecurrentsong", false);
	help.changeStepPointEl("setfavourite", false);
	help.changeTopicPointEl("setfavourite", false);
	
	that.init = function() {
		that.animateIn();
	};
	
	that.uninit = function() {
		that.destruct();
		that.animateOut();
	};
	
	
	that.enableRating = function() {};
	that.disableRating = function() {};
	
	return that;
};

var NPLiveShow = function(npp, json) {
	var that = {};
	that.p = json;
	that.el = svg.makeEl("g");
	
	theme.Extend.NPLiveShow(that, npp);
	that.draw();
	
	help.changeStepPointEl("ratecurrentsong", false);
	help.changeTopicPointEl("ratecurrentsong", false);
	help.changeStepPointEl("setfavourite", false);
	help.changeTopicPointEl("setfavourite", false);	
	
	that.init = function() {
		that.destruct();
		that.animateIn();
	};
	
	that.uninit = function() {
		that.animateOut();
	};
	
	that.enableRating = function() {};
	that.disableRating = function() {};
	
	return that;
};

var NPOneShot = function(npp, json) {
	var that = {};
	that.el = svg.makeEl("g");
	that.p = json;
	
	theme.Extend.NPOneShot(that, npp);
	that.draw();
	
	help.changeStepPointEl("ratecurrentsong", [ that.songrating.grid ]);
	help.changeTopicPointEl("ratecurrentsong", [ that.songrating.grid ]);
	help.changeStepPointEl("setfavourite", [ that.songrating.favbutton ]);
	help.changeTopicPointEl("setfavourite", [ that.songrating.favbutton ]);
	
	that.init = function() {
		that.animateIn();
	};
	
	that.uninit = function() {
		that.destruct();
		that.animateOut();
	};
	
	that.enableRating = function() {
		that.songrating.enable();
		that.albumrating.enable();
	};
	
	that.disableRating = function() {
		that.songrating.disable();
		that.albumrating.disable();
	};
	
	return that;
};

var NPPlaylist = function(npp, json) {
	var that = {};
	that.el = svg.makeEl("g");
	that.p = json;
	
	theme.Extend.NPPlaylist(that, npp);
	that.draw();
	
	help.changeStepPointEl("ratecurrentsong", [ that.songrating.grid ]);
	help.changeTopicPointEl("ratecurrentsong", [ that.songrating.grid ]);
	help.changeStepPointEl("setfavourite", [ that.songrating.favbutton ]);
	help.changeTopicPointEl("setfavourite", [ that.songrating.favbutton ]);
	
	that.init = function() {
		that.animateIn();
	};
	
	that.uninit = function() {
		that.destruct();
		that.animateOut();
	};
	
	that.enableRating = function() {
		that.songrating.enable();
		that.albumrating.enable();
	};
	
	that.disableRating = function() {
		that.songrating.disable();
		that.albumrating.disable();
	};
	
	return that;
};

var NPAdSet = function(npp, json) {
	var that = {};
	that.el = svg.makeEl("g");
	that.p = json;
	
	help.changeStepPointEl("ratecurrentsong", false);
	help.changeTopicPointEl("ratecurrentsong", false);
	help.changeStepPointEl("setfavourite", false);
	help.changeTopicPointEl("setfavourite", false);
	
	theme.Extend.NPAdSet(that, npp);
	that.draw();
	
	that.init = function() {
		that.animateIn();
	};
	
	that.uninit = function() {
		that.destruct();
		that.animateOut();
	};
	
	that.enableRating = function() {};
	
	that.disableRating = function() {};
	
	return that;
};