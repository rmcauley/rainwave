/* Rainwave 3 Built-In Panels */

// Making Panels 101: Define a unique class name.
SlackPanel = function() {
	// Define the edi sub-object for Edi settings.
	this.ediopts = function(){};
	// The (y|x)type variables define how the panel is fitted into the Edi grid.  Here they are listed in priority:
	// 	fixed - the panel cannot be shrunken or expanded on the row/column
	//	max   - the panel will expand to consume as much space as possible on the row/column
	//	fit   - the panel will be fitted to its appropriate size
	//	slack - the panel will use whatever space is leftover on the row/column (while obeying its minimum size)
	// Slack space is divided evenly amongst all slack panels if there is any.
	// Be careful that if you put a slack and max panel type on the same column/row, the slack column will be at its minimum size.
	// When there is no max or slack panel on a row, all panels get the extra space evenly
	// If all panels are at their minimum size, all panels will be shrunk equally to fit on the screen
	// Only max type columns will do *row* spanning.  slack and fit panels will not span rows.
	this.ediopts.ytype = "slack";
	// Desired minimum height of the panel.  This is ignored for "slack" type panels.
	this.ediopts.height = 100;
	// Minimum height the panel requires
	this.ediopts.minheight = 50;
	this.ediopts.xtype = "slack";
	this.ediopts.width = 100;
	this.ediopts.minwidth = 50;
	// Title to report to Edi for tab names and layout editor.
	this.ediopts.title = "Slack Space";
	// This variable will be given the "owning" Edi panel
	this.edi = false;
};
// Now you can add it to Edi's 'available panels' array.
edi.panels['SlackPanel'] = new EdiPanel(new SlackPanel(), "SlackPanel");
// Now we need the init function Edi calls once you have a ready-to-draw element
SlackPanel.prototype = {
	// The init function will take the element (a <div>) that Edi gives you.  Style it as you wish from here,
	//	but don't touch width or height please. :)
	init: function(element) {
		this.el = element;
		this.el.style.background = "#000077";
		this.el.textContent = "slack!";
	}
};

NowPanel = function() {
	this.ediopts = function(){};
	this.ediopts.ytype = "fixed";
	this.ediopts.height = svg.em * 7;
	this.ediopts.minheight = this.ediopts.height;
	this.ediopts.xtype = "fixed";
	this.ediopts.width = svg.em * 20;
	this.ediopts.minwidth = this.ediopts.width;
	this.ediopts.title = "Now Playing";
}
edi.panels['NowPanel'] = new EdiPanel(new NowPanel(), "NowPanel");
NowPanel.prototype = {
	init: function(element) {
		this.container = element;
		this.container.style.background = "#770000";
		this.container.textContent = "Now Playing";
	}
}

NowDetailPanel = function() {
	this.ediopts = function(){};
	this.ediopts.ytype = "slack";
	this.ediopts.height = svg.em * 5;
	this.ediopts.minheight = this.ediopts.height;
	this.ediopts.xtype = "slack";
	this.ediopts.width = svg.em * 5;
	this.ediopts.minwidth = this.ediopts.width;
	this.ediopts.title = "Now Playing Details";
}
edi.panels['NowDetailPanel'] = new EdiPanel(new NowDetailPanel(), "NowDetailPanel");
NowDetailPanel.prototype = {
	init: function(element) {
		this.container = element;
		this.container.style.background = "#007700";
		this.container.textContent = "Now Playing Details";
	}
}

LogoPanel = function() {
	this.ediopts = function(){};
	this.ediopts.ytype = "fixed";
	this.ediopts.height = svg.em * 7;
	this.ediopts.minheight = this.ediopts.height;
	this.ediopts.xtype = "fixed";
	this.ediopts.width = svg.em * 30;
	this.ediopts.minwidth = this.ediopts.width;
	this.ediopts.title = "Information";
}
edi.panels['LogoPanel'] = new EdiPanel(new LogoPanel(), "LogoPanel");
LogoPanel.prototype = {
	init: function(element) {
		this.container = element;
		this.container.style.background = "#000077";
		this.container.textContent = "Logo";
	}
}


COGBanner = function() {
	this.ediopts = function(){};
	this.ediopts.ytype = "fit";
	this.ediopts.height = 100;
	this.ediopts.minheight = this.ediopts.height;
	this.ediopts.xtype = "fixed";
	this.ediopts.width = 20;
	this.ediopts.minwidth = this.ediopts.width;
	this.ediopts.title = "COG";
}
edi.panels['COGBanner'] = new EdiPanel(new COGBanner(), "COGBanner");
COGBanner.prototype = {
	init: function(element) {
		this.container = element;
		this.container.style.background = "#777700";
		this.container.textContent = "C";
	}
}

MainMPI = new EdiMPI();
MainMPI.ediopts = function(){};
MainMPI.ediopts.ytype = "max";
MainMPI.ediopts.height = svg.em * 20;
MainMPI.ediopts.minheight = svg.em * 5;
MainMPI.ediopts.xtype = "max";
MainMPI.ediopts.width = svg.em * 40;
MainMPI.ediopts.minwidth = svg.em * 5;
MainMPI.ediopts.title = "Main Panel";
edi.panels['MainMPI'] = new EdiPanel(MainMPI, "EdiMPI");

RequestsPanel = function() {
	this.ediopts = function(){};
	this.ediopts.ytype = "slack";
	this.ediopts.height = svg.em * 2;
	this.ediopts.minheight = this.ediopts.height;
	this.ediopts.xtype = "fit";
	this.ediopts.width = svg.em * 25;
	this.ediopts.minwidth = svg.em * 10;
	this.ediopts.title = "Requests";
}
edi.panels['RequestsPanel'] = new EdiPanel(new RequestsPanel(), "RequestsPanel");
RequestsPanel.prototype = {
	init: function(element) {
		this.container = element;
		this.container.style.background = "#770077";
		this.container.textContent = "Requests";
	}
}

LogPanel = function() {
	this.ediopts = function(){};
	this.ediopts.ytype = "fit";
	this.ediopts.height = svg.em * 15;
	this.ediopts.minheight = svg.em * 10;
	this.ediopts.xtype = "fit";
	this.ediopts.width = svg.em * 15;
	this.ediopts.minwidth = svg.em * 10;
	this.ediopts.title = "Log";
}
edi.panels['LogPanel'] = new EdiPanel(new LogPanel(), "LogPanel");
LogPanel.prototype = {
	init: function(element) {
		this.el = element;
		log.addCallback(document.getElementById("log"), this.fillDiv, "all");
		this.el.style.overflow = "scroll";
		for (var facility in log.content) {
			if (typeof(log.content[facility]) != "object") continue;
			for (var i = 0; i < log.content[facility].length; i++) {
				this.fillDiv(facility, log.codes[facility][i], log.content[facility][i]);
			}
		}
	},
	fillDiv: function(facility, code, message) {
		this.el.innerHTML = "<b>" + facility + " " + code + "</b>: " + message + "<br />" + this.el.innerHTML;
	}
}

TimelinePanel = function() {
	this.ediopts = function(){};
	this.ediopts.ytype = "max";
	this.ediopts.height = svg.em * 10;
	this.ediopts.minheight = svg.em * 20;
	this.ediopts.xtype = "fit";
	this.ediopts.width = svg.em * 40;
	this.ediopts.minwidth = svg.em * 25;
	this.edititle = "Timeline";
};
edi.panels['TimelinePanel'] = new EdiPanel(new TimelinePanel(), "TimelinePanel");
TimelinePanel.prototype = {
	init: function(element) {
		this.el = element;
		this.xml = false;
		this.eventnow = false;
		this.events = new Array();
		ajax.addCallback(this, this.ajaxHandle, "sched_current");
	},
	
	ajaxHandle: function(xml) {
		this.xml = xml;
		this.update();
	},
	
	update: function() {
		this.events = this.xml.getElementsByTagName("sched_event");
		this.eventnow = new TimelineElection();
		this.eventnow.init(this.events[0], this.el);
		this.el.appendChild(this.eventnow.svg);
	}
};

TimelineElection = function(){};
TimelineElection.prototype = {
	init: function(xml, container) {
		this.xml = xml;
		this.songxml = this.xml.getElementsByTagName("song_data")[0].getElementsByTagName("song");
		
		this.songs = new Array();
		this.container = container;
		this.width = container.offsetWidth;
		this.height = theme.TimelineSong_height * this.songxml.length + 1;
		
		this.svg = svg.make();
		this.svg.setAttribute("width", this.width);
		this.svg.setAttribute("height", this.height);
		this.el = this.svg;
		
		this.draw();

		for (var sn = 0; sn < this.songxml.length; sn++) {
			this.songs[sn] = new TimelineSong();
			this.songs[sn].init(this.songxml[sn], this, 0, (sn * theme.TimelineSong_height), sn);
			this.el.appendChild(this.songs[sn].el);
		}
		
		this.svg.appendChild(this.el);
	},
	themeInit: function() {
		return;
	}
};

TimelineSong = function(){};
TimelineSong.prototype = {
	init: function(xml, parent, x, y, songnum) {
		this.xml = xml;
		this.parent = parent;
		this.songnum = songnum;

		this.song = new Song(this.xml);
		this.album = new Album(this.xml);
		this.artists = new Array();
		var artistar = this.xml.getElementsByTagName("artists")[0].getElementsByTagName("artist");
		for (var i = 0; i < artistar.length; i++) this.artists.push(new Artist(artistar[i]));

		this.el = svg.makeEl("g");
		this.el.setAttribute("transform", "translate(" + svg.xoffset("g", x) + ", " + svg.yoffset("g", y) + ")");
		
		this.draw();

		this.album.enable();
		for (var i = 0; i < this.artists.length; i++) this.artists[i].enable();
		
		if (typeof(this.voteHoverOn) == "function")
			this.votehoverel.addEvent('mouseover', this.voteHoverOn.bind(this));
		if (typeof(this.voteHoverOff) == "function")
			this.votehoverel.addEvent('mouseout', this.voteHoverOff.bind(this));
	},
	themeInit: function() {
		return;
	},
};

Rating = function(category, id, userrating, siterating, ratable, x, y, fav) {
	this.category = category;
	this.id = id;
	this.userrating = userrating;
	this.siterating = 3;
	this.ratable = ratable;
	this.favourite = fav;
	this.el = svg.makeEl("g");
	this.el.setAttribute("transform", "translate(" + svg.xoffset("g", x) + ", " + svg.yoffset("g", y) + ")");
	
	this.draw();
	
	this.setUser(this.userrating);
	this.setSite(this.siterating);
	
	if (this.ratable) {
		this.mousecatch.addEvent("mousemove", this.onMouseMove.bind(this));
		this.mousecatch.addEvent("mouseout", this.onMouseOut.bind(this));
		this.mousecatch.addEvent("click", this.onClick.bind(this));
	}
	
	this.fav.addEvent("mouseover", this.favMouseOver.bind(this));
	this.fav.addEvent("mouseout", this.favMouseOut.bind(this));
	this.fav.addEvent("click", this.favClick.bind(this));
};
Rating.prototype = {
	themeInit: function() {
		return;
	},
	onMouseMove: function(evt) {
		this.setUser(this.scrubRating(this.userCoord(evt)));
		evt.stopPropagation();
	},
	onMouseOut: function(evt) {
		this.resetUser();
		evt.stopPropagation();
	},
	onClick: function(evt) {
		this.userrating = this.scrubRating(this.userCoord(evt));
		this.setUser(this.userrating);
		evt.stopPropagation();
	},
	scrubRating: function(rating) {
		if (rating < 1) rating = 1;
		else if (rating > 5) rating = 5;
		return Math.round(rating * 2) / 2;
	},
	favMouseOver: function(evt) {
		this.favChange(2);
	},
	favMouseOut: function(evt) {
		this.favChange(this.favourite);
	},
	favClick: function(evt) {
		if (this.favourite) this.favourite = false;
		else this.favourite = true;
		this.favChange(this, this.favourite);
	}
};
