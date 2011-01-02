/* Eurydice (Edi) 1.0
	for http://rainwave.cc
	(c) Robert McAuley, 2010
	
	This is the class that controls all of Rainwave 3's business.  You shouldn't be reading this, you should see a skin or panel.
	*/

/* Log Codes
 0000 - Untranslated debug

 Do NOT use "all" for a facility!  That is a reserved word for the "all" callback.
*/
	
EdiLogger = function() {
	this.content = function(){};
	this.callbacks = function(){};
	this.multicall = function(){};
	this.codes = function(){};
	this.callbacks['all'] = new Array();
};
EdiLogger.prototype = {
	log: function(facility, code, message, flush) {
		// Starting a new facility
		if (typeof(this.content[facility]) == "undefined") this.newFacility(facility);

		// Detecting that we have to flush before proceeding with a new line
		if ((typeof(flush) == "undefined") && (this.multicall[facility] == true)) {
			this.flush(facility);
		}

		// If it's a normal one-call log
		if (typeof(flush) == "undefined") {
			this.codes[facility].push(code);
			this.content[facility].push(message);

			this.trim(facility);
			this.callback(facility, code, message);
		}
		// If we're starting a new multicall
		else if (this.multicall[facility] == false) {
			this.content[facility].push(message);
			this.codes[facility].push(code);
			this.multicall[facility] = true;
		}
		// Continuing a multi-call
		else {
			this.content[facility][this.content[facility].length - 1] += message;
		}
	},
	newFacility: function(facility) {
		this.codes[facility] = new Array();
		this.content[facility] = new Array();
		this.multicall[facility] = false;
		this.callbacks[facility] = new Array();
	},
	trim: function(facility) {
		while (this.content[facility].length > 100) this.content[facility].shift();
	},
	callback: function(facility, code, message) {
		for (var i = 0; i < this.callbacks[facility].length; i++) {
			this.callbacks[facility][i](facility, code, message);
		}
		for (var i = 0; i < this.callbacks["all"].length; i++) {
			this.callbacks["all"][i](facility, code, message);
		}
	},
	// pass a function that takes (facility, code, message) as arguments.
	addCallback: function(obj, func, facility) {
		if (typeof(this.content[facility]) == "undefined") this.newFacility(facility);
		this.callbacks[facility].push(func.bind(obj));
	},
	flush: function(facility) {
		if (typeof(facility) == "undefined") {
			this.flushAll();
		}
		else {
			if (this.multicall[facility] == true) {
				this.trim(facility);
				this.callback(facility, this.codes[facility].getLast(), this.content[facility].getLast());
			}
			this.multicall[facility] = false;
		}
	},
	flushAll: function() {
		for (var i in this.multicall) this.multicall[i] = false;
	}
};

log = new EdiLogger();
	
EdiPanel = function(base, basename) {
	this.base = base;
	this.row = 0;
	this.column = 0;
	this.width = (this.base.ediopts.xtype == "slack") ? this.base.ediopts.minwidth : this.base.ediopts.width;
	this.height = (this.base.ediopts.ytype == "slack") ? this.base.ediopts.minheight : this.base.ediopts.height;
	this.colspan = 1;
	this.rowspan = 1;
	this.basename = basename;
	if ((typeof(this.base.ediopts.mpi) != "undefined") && this.base.ediopts.mpi) {
		this.mpi = true;
		this.mpikey = this.base.ediopts.mpikey;
	}
	else {
		this.mpi = false;
		this.mpikey = "";
	}
};

EdiLayout = function(layout, name) {
	this.name = name;
	this.layout = $A(layout);
	this.colw = new Array();
	this.rowh = new Array();
	this.mincolw = new Array();
	this.minrowh = new Array();
	this.openpanels = function(){};
	this.colflags = new Array();
	this.rowflags = new Array();
	this.borders = new Array();
}
EdiLayout.prototype = {
	sizeLayout: function() {
		var maxcols = 0;
		for (var i = 0; i < this.layout.length; i++) {
			this.rowh[i] = 0;
			this.minrowh[i] = 0;
			if (this.layout[i].length > maxcols) maxcols = this.layout[i].length;
		}
		
		var colw = new Array();
		var mincolw = new Array();
		for (var j = 0; j < maxcols; j++) {
			this.colw[j] = 0;
			this.mincolw[j] = 0;
		}
		log.log("Edi", 0, "maxcols = " + maxcols);
		
		// Step 1: Find out the normal width/height for each column and row and the minimum width/height
		for (var i = 0; i < this.layout.length; i++) {
			for (var j = 0; j < this.layout[i].length; j++) {
				this.layout[i][j].row = i;
				this.layout[i][j].column = j;
				if (this.rowh[i] < this.layout[i][j].height) this.rowh[i] = this.layout[i][j].height;
				if (this.minrowh[i] < this.layout[i][j].base.ediopts.minheight) this.minrowh[i] = this.layout[i][j].base.ediopts.minheight;
				if (this.colw[j] < this.layout[i][j].width) this.colw[j] = this.layout[i][j].width;
				if (this.mincolw[j] < this.layout[i][j].base.ediopts.minwidth) this.mincolw[j] = this.layout[i][j].base.ediopts.minwidth;
			}
		}
		
		// Step 2: Get how large our current layout is
		var ediwidth = 0;
		var ediheight = 0;
		log.log("Edi", 0, "Heights: ", false);
		for (var i = 0; i < this.layout.length; i++) {
			ediheight += this.rowh[i];
			log.log("Edi", 0, this.rowh[i] + " ", false);
		}
		log.flush("Edi");
		log.log("Edi", 0, "Widths: ", false);
		for (var j = 0; j < maxcols; j++) {
			ediwidth += this.colw[j];
			log.log("Edi", 0, this.colw[j] + " ", false);
		}
		log.flush("Edi");
		
		log.log("Edi", 0, "Size: " + ediwidth + " " + ediheight);
		log.log("Edi", 0, "Screen: " + window.innerWidth + " " + window.innerHeight);
		// Step 3: Shrink or expand panels to fit screen
		var xbudget = window.innerWidth - ediwidth;
		var ybudget = window.innerHeight - ediheight;

		log.log("Edi", 0, "Budgets: " + xbudget + " " + ybudget);
		
		// Find out which columns and rows are slackable or maxable
		for (var i = 0; i < this.layout.length; i++) this.rowflags[i] = "slack";
		for (var j = 0; j < maxcols; j++) this.colflags[j] = "slack";
		for (var i = 0; i < this.layout.length; i++) {
			for (var j = 0; j < this.layout[i].length; j++) {
				// Fixed always takes precedence
				if ((this.rowflags[i] == "fixed") || (this.layout[i][j].base.ediopts.ytype == "fixed")) {
					this.rowflags[i] = "fixed";
				}
				// max is second in command
				else if ((this.rowflags[i] == "max") || (this.layout[i][j].base.ediopts.ytype == "max")) {
					this.rowflags[i] = "max";
				}
				// if we have a fit column, do not use slack space
				else if ((this.rowflags[i] == "fit") || (this.layout[i][j].base.ediopts.ytype == "fit")) {
					this.rowflags[i] = "fit";
				}
				// slack is the default flag as a last resort

				if ((this.colflags[j] == "fixed") || (this.layout[i][j].base.ediopts.xtype == "fixed")) {
					this.colflags[j] = "fixed";
				}
				else if ((this.colflags[j] == "max") || (this.layout[i][j].base.ediopts.xtype == "max")) {
					this.colflags[j] = "max";
				}
				else if ((this.colflags[j] == "fit") || (this.layout[i][j].base.ediopts.xtype == "fit")) {
					this.colflags[j] = "fit";
				}
			}
		}

		this.colw = this.getGridSize(this.colw, this.mincolw, this.colflags, xbudget, theme.borderwidth);
		this.rowh = this.getGridSize(this.rowh, this.minrowh, this.rowflags, ybudget, theme.borderheight);

		// Solve column spanning
		var rowspanstops = new Array();
		for (var i = 0; i < this.layout.length; i++) rowspanstops[i] = -1;
		for (var i = 0; i < this.layout.length; i++) {
			for (var j = 0; j < this.layout[i].length; j++) {
				this.layout[i][j].height = this.rowh[i];
			}
			var coldeficit = maxcols - this.layout[i].length;
			if ((rowspanstops[i] > 0) && (rowspanstops[i] < maxcols)) coldeficit = rowspanstops[i] - this.layout[i].length;
			var spancol = new Array();
			// Have maxed panels span rows
			log.log("Edi", 0, "Row " + i + " column deficit: " +  coldeficit);
			for (var j = 0; j < this.layout[i].length; j++) {
				if (this.colflags[j] == "max") spancol.push(j);
				if (this.layout[i][j].base.ediopts.ytype == "max") {
					// this is where row spanning happens :D
					for (var k = (i + 1); k < this.layout.length; k++) {
						if (this.layout[k].length <= j) {
							this.layout[i][j].rowspan++;
							this.layout[i][j].height += this.rowh[k] + theme.borderheight;
							if (rowspanstops[k] < j) rowspanstops[k] = j;
						}
						else break;
					}
					if (this.layout[i][j].rowspan > 1) log.log("Edi", 0, "Row " + i + " column " + j + " will span " + this.layout[i][j].rowspan + " rows.");
				}
			}
			// If there were no max panels and there are slack panels, give the deficit to slack
			if (spancol.length == 0) {
				for (var j = 0; j < this.layout[i].length; j++) { if (this.colflags[j] == "slack") spancol.push(j); }
			}
			// If all else fails, use the final column
			if (spancol.length == 0) {
				spancol.push(this.layout[i].length - 1);
			}
			var spanpercol = Math.ceil(coldeficit / spancol.length);
			var j = spancol.length - 1;
			while ((j >= 0) && (coldeficit > 0)) {
				this.layout[i][spancol[j]].colspan += spanpercol;
				coldeficit -= spanpercol;
				j--;
			}
			var spans = 0;
			for (var j = 0; j < this.layout[i].length; j++) {
				this.layout[i][j].column = j + spans;
				this.layout[i][j].width = this.colw[this.layout[i][j].column];
				for (var k = 1; k < this.layout[i][j].colspan; k++) {
					this.layout[i][j].width += this.colw[this.layout[i][j].column + k] + theme.borderwidth;
				}
				spans += (this.layout[i][j].colspan - 1);
			}
		}
	},
	drawGrid: function(element) {
		// now draw panels
		var runningy = 0;
		for (var i = 0; i < this.layout.length; i++) {
			var runningx = 0;
			this.borders[i] = new Array();
			for (var j = 0; j < this.layout[i].length; j++) {
				var panelel = document.createElement("div");
				panelel.setAttribute("style", "position: absolute; left: " + runningx + "px; top: " + runningy + "px; width: " + this.layout[i][j].width + "px; height: " + this.layout[i][j].height + "px;");
				eval("this.openpanels[this.layout[i][j].basename] = new " + this.layout[i][j].basename + "();");
				this.openpanels[this.layout[i][j].basename].edi = this.parent;
				this.openpanels[this.layout[i][j].basename].init(panelel);
				element.appendChild(panelel);
				
				if ((j + this.layout[i][j].colspan) < this.colflags.length) {
					var border = svg.make();
					border.setAttribute("style", "position: absolute; left: " + (runningx + this.layout[i][j].width) + "px; top: " + runningy + "px; width: " + theme.borderwidth + "px; height: " + this.layout[i][j].height + "px;");
					theme.borderVertical(border);
					element.appendChild(border);
				}
				
				if ((i + this.layout[i][j].rowspan) < this.layout.length) {
					var border = svg.make();
					border.setAttribute("style", "position: absolute; left: " + runningx + "px; top: " + (runningy + this.layout[i][j].height) + "px; width: " + this.layout[i][j].width + "px; height: " + theme.borderheight + "px;");
					theme.borderHorizontal(border);
					element.appendChild(border);
				}
				
				runningx += this.layout[i][j].width + theme.borderwidth;
			}
			runningy += this.rowh[i] + theme.borderheight;
		}
	},
	getGridSize: function(sizes, minsizes, flags, budget, bordersize) {
		budget -= (bordersize * (sizes.length - 1));
		
		// Find out how many max/slack cells we have
		var nummax = 0;
		var numslack = 0;
		log.log("Edi", 0, "Cell flags: ", false);
		for (var j = 0; j < flags.length; j++) {
			log.log("Edi", 0, flags[j] + " ", false);
			if (flags[j] == "max") nummax++;
			else if (flags[j] == "slack") numslack++;
		}
		log.flush("Edi");

		// If we've got width to spare, let's maximize any cells
		if ((budget > 0) && (nummax > 0)) {
			var addwidth = Math.floor(budget / nummax);
			var spare = budget - addwidth;		// catch rounding errors!
			log.log("Edi", 0, "Maximizing " + nummax + " cells.");
			for (var j = 0; j < flags.length; j++) {
				if (flags[j] == "max") {
					sizes[j] += addwidth + spare;
					budget -= addwidth - spare;
					log.log("Edi", 0, "Cell " + j + ", added " + (addwidth + spare) + ".");
					spare = 0;
				}
			}
		}
		// Shrink or expand slack space if available
		if ((budget != 0) && (numslack > 0)) {
			var addwidth = Math.floor(budget / numslack);
			var spare = budget - addwidth;
			log.log("Edi", 0, "Shrinking/expanding slack space.  Addwidth: " + addwidth + " / spare: " + spare);
			for (var j = 0; j < flags.length; j++) {
				if (flags[j] == "slack") {
					log.log("Edi", 0, "Slack cell " + j + ".  minsize: " + minsizes[j] + " / size: " + sizes[j] + " / budget: " + budget + " / addwidth: " + addwidth + " / spare: " + spare);
					if ((sizes[j] + addwidth + spare) < minsizes[j]) {
						log.log("Edi", 0, "Slack not enough on " + j + ".  Shrinking to min. " + (sizes[j] - minsizes[j]));
						budget -= (sizes[j] - minsizes[j]);
						sizes[j] = minsizes[j];
					}
					else {
						log.log("Edi", 0, "Slack used.");
						sizes[j] += (addwidth + spare);
						budget -= (addwidth + spare);
						spare = 0;
					}
				}
			}
		}
		log.log("Edi", 0, "Budget after max and slack: " + budget);
		// Shrink all columns.
		if (budget < 0) {
			// Add up the minimum attainable width
			var minwidthtotal = 0;
			for (var j = 0; j < minsizes.length; j++) minwidthtotal += minsizes[j];
			log.log("Edi", 0, "Need to shrink cells.  Minimum width total: " + minwidthtotal);
			// If minimum width is <= available width, we can shrink some of our columns without doing any sacrifices.
			if (minwidthtotal <= window.innerWidth) {
				var shrinkable = 1;
				var lastshrink = window.innerWidth;
				while ((budget < 0) && (shrinkable > 0)) {
					var largestmin = 0;
					shrinkable = 0;
					for (var j = 0; j < sizes.length; j++) {
						if ((sizes[j] > minsizes[j]) && (lastshrink > minsizes[j])) {
							largestmin = minsizes[j];
							lastshrink = minsizes[j];
						}
					}
					log.log("Edi", 0, "Shrink loop: budget: " + budget + " / largestmin: " + largestmin + " / lastshrink: " + lastshrink);
					var gain = 0;
					for (var j = 0; j < sizes.length; j++) {
						if ((sizes[j] > minsizes[j]) && (minsizes[j] <= largestmin)) {
							shrinkable++;
							gain += (sizes[j] - largestmin);
						}
					}
					if (gain > Math.abs(budget)) gain = Math.abs(budget);
					log.log("Edi", 0, "Shrink loop: shrinkable: " + shrinkable + " / gain: " + gain);
					if (shrinkable > 0) {
						var shrinkeach = Math.floor(gain / shrinkable);
						var spare = gain - (shrinkeach * shrinkable);
						log.log("Edi", 0, "Shrink loop: shrinkeach = " + shrinkeach + " / spare: " + spare);
						for (var j = 0; j < sizes.length; j++) {
							if ((sizes[j] > minsizes[j]) && (minsizes[j] <= largestmin)) {
								sizes[j] -= shrinkeach - spare;
								spare = 0;
								budget += shrinkeach + spare;
								log.log("Edi", 0, "Shrinking cell " + j + " to " + sizes[j] + " / budget: " + budget);
							}
						}
					}
				}
			}
			
			if (budget < 0) {
				// Find out how much other space can be squeezed evenly out of the other columns
				var shrinkable = 0;
				for (var j = 0; j < sizes.length; j++) {
					if (flags[j] != "fixed") shrinkable++;
				}
				var subwidth = Math.floor(Math.abs(budget) / shrinkable);
				var spare = Math.abs(budget) - (subwidth * shrinkable);
				log.log("Edi", 0, "Final shrink subwidth and spare: " + subwidth + "  " + spare);
				for (var j = 0; j < sizes.length; j++) {
					if (flags[j] != "fixed") {
						sizes[j] -= subwidth - spare;
						budget += subwidth + spare;
						spare = 0;
					}
				}
			}
		}
		
		log.log("Edi", 0, "Final budget: " + budget);
		return sizes;
	},
}

Edi = function() {
	this.panels = function(){};
	this.layouts = function(){};
	this.openpanels = function(){};
	this.layout = false;
};
Edi.prototype = {
	init: function() {
		var defaultlayout = new Array();
		var row1 = new Array();
		row1.push(this.panels["NowPanel"]);
		row1.push(this.panels["NowDetailPanel"]);
		row1.push(this.panels["LogoPanel"]);
		row1.push(this.panels["COGBanner"]);
		defaultlayout.push(row1);
		var row2 = new Array();
		row2.push(this.panels["TimelinePanel"]);
		row2.push(this.panels["MainMPI"]);
		defaultlayout.push(row2);
		var row3 = new Array();
		row3.push(this.panels['LogPanel']);
		defaultlayout.push(row3);
		var row4 = new Array();
		row4.push(this.panels["RequestsPanel"]);
		defaultlayout.push(row4);
		this.layouts['default'] = new EdiLayout(defaultlayout, "Default Layout");
		
		this.layouts['default'].sizeLayout();
		this.layouts['default'].drawGrid(document.getElementById("body"));
	},

};

var edi = new Edi();


EdiMPI = function() {
	this.ediopts = function(){};
	this.ediopts.ytype = "slack";
	this.ediopts.height = 0;
	this.ediopts.minheight = 0;
	this.ediopts.width = 0;
	this.ediopts.minwidth = 0;
	this.ediopts.title = "Multiple Panel Interface Base Class";
	this.ediopts.mpi = true;
	this.ediopts.mpikey = "base";
}
edi.panels['EdiMPI'] = new EdiPanel(new EdiMPI(), "EdiMPI");
EdiMPI.prototype = {
	init: function(element) {
		element.textContent = "MPI";
		element.style.background = "#0077AA";
	}
}

function formatTime(seconds) {
	var minutes = Math.floor(seconds / 60);
	var seconds = seconds - (minutes * 60);
	if (seconds < 10) seconds = "0" + seconds;
	return minutes + ":" + seconds;
}

// returns true if changed, false if not.  textel is a reference and will be changed if necessary.
// expects <text> filled with <tspans> and no internal text at all (only tspans!)
function fitTSpans(textel, maxwidth, chop) {
	var toreturn = false;
	var textdiv = document.createElement("div");
	textdiv.setAttribute("style", "position: absolute; left: -1000px; display: inline;");
	document.getElementById("body").appendChild(textdiv);
	var tspans = textel.getElementsByTagName("tspan");
	var maxi = 0;
	for (var i = 0; i < tspans.length; i++) {
		var prevwidth = textdiv.offsetWidth;
		textdiv.appendChild(document.createTextNode(tspans[i].textContent));
		maxi = i;
		if (textdiv.offsetWidth > maxwidth) {
			toreturn = true;
			if ((i > 0) && chop) break;
			tspans[i].textContent = fitText(tspans[i].textContent, (maxwidth - prevwidth));
			break;
		}
	}
	for (var i = (tspans.length - 1); i > maxi; i--) {
		toreturn = true;
		textel.removeChild(tspans[i]);
	}
	document.getElementById("body").removeChild(textdiv);
	return toreturn;
}

function fitText(text, maxwidth) {
	var textdiv = document.createElement("div");
	textdiv.setAttribute("style", "position: absolute; left: -1000px; display: inline;");
	document.getElementById("body").appendChild(textdiv);
	var textnode = document.createTextNode(text);
	textdiv.appendChild(textnode);
	// prime the ellipsis if necessary
	if (textdiv.offsetWidth > maxwidth) textnode.textContent += "...";
	else return textnode.textContent;
	while (textdiv.offsetWidth > maxwidth) {
		// we do length - 4 so we can always keep the ellpisis intact at the end, and included in the measurements
		textnode.textContent = textnode.textContent.substring(0, (textnode.textContent.length - 4)) + "...";
	}
	document.getElementById("body").removeChild(textdiv);
	return textnode.textContent;
}

function parseXMLIntoObj(xml, obj, strbegin) {
	var props = xml.getChildren(); //(searchstr);
	for (var i = 0; i < props.length; i++) {
		if ((props[i].nodeType == 1) && (props[i].nodeName.indexOf(strbegin) == 0)) obj[props[i].nodeName] = props[i].textContent;
	}
};

Song = function(xml) {
	parseXMLIntoObj(xml, this, "song");
};
Song.prototype = {
	enable: function() {
		if (!this.el) return;
		this.el.addEvent('click', this.onClick.bind(this));
		if (typeof(this.onMouseOver) == "function") this.el.addEvent('mouseover', this.onMouseOver.bind(this));
		if (typeof(this.onMouseOut) == "function") this.el.addEvent('mouseout', this.onMouseOut.bind(this));
	},
	onClick: function(evt) {
		alert(this.song_title);
	}
};

Album = function(xml, el) {
	parseXMLIntoObj(xml, this, "album");
};
Album.prototype = {
	enable: function() {
		if (!this.el) return;
		this.el.addEvent('click', this.onClick.bind(this));
		if (typeof(this.onMouseOver) == "function") this.el.addEvent('mouseover', this.onMouseOver.bind(this));
		if (typeof(this.onMouseOut) == "function") this.el.addEvent('mouseout', this.onMouseOut.bind(this));
	},
	onClick: function() {
		alert(this.album_name);
	}
};

Artist = function(xml, el) {
	parseXMLIntoObj(xml, this, "artist");
};
Artist.prototype = {
	enable: function() {
		if (!this.el) return;
		this.el.addEvent('click', this.onClick.bind(this));
		if (typeof(this.onMouseOver) == "function") this.el.addEvent('mouseover', this.onMouseOver.bind(this));
		if (typeof(this.onMouseOut) == "function") this.el.addEvent('mouseout', this.onMouseOut.bind(this));
	},
	onClick: function() {
		alert(this.artist_name);
	}
};