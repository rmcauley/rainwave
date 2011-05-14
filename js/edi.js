var edi = function() {
	var that = {};
	var layouts = {};
	var clayout = false;
	var oldurl = location.href;
	if (location.href.indexOf("#") >= 0) {
		location.href = location.href.substring(0, location.href.indexOf("#"));
		oldurl = location.href;
	}
	var urlhistory = [];
	that.openpanels = {};
	
	that.getDefaultLayout = function() {
		return [
			[ { "panel": "MenuPanel", "rowspan": 1, "colspan": 2 } ],
			[ { "panel": "TimelinePanel", "rowspan": 2, "colspan": 1 }, { "panel": "NowPanel", "rowspan": 1, "colspan": 1 } ],
			[ false, { "panel": "MainMPI", "rowspan": 1, "colspan": 1 } ]
		];
	};
	
	that.urlChangeDetect = function() {
		if (oldurl != location.href) {
			var i = parseInt(location.href.substring(location.href.indexOf("#") + 1));
			if (urlhistory[i]) {
				that.openPanelLink(urlhistory[i].panel, urlhistory[i].link);
			}
			oldurl = location.href;
		}
	};
	
	that.openPanelLink = function(panel, link) {
		if (link.history) {
			delete(link.history);
			urlhistory.push({ "panel": panel, "link": link });
			if (location.href.indexOf("#") >= 0) oldurl = location.href.substring(0, location.href.indexOf("#")) + "#" + (urlhistory.length - 1);
			else oldurl = location.href + "#" + (urlhistory.length - 1);
			location.href = oldurl;
		}
		if (typeof(that.openpanels[panel]) != "undefined") {
			that.openpanels[panel].openLink(link);
			return;
		}
		for (i in that.openpanels) {
			if (that.openpanels[i].mpi) {
				if (that.openpanels[i].openPanelLink(panel, link)) 
					return;
			}
		}
	};
	
	// TODO: Scrub on load
	that.loadLayouts = function() {
		var cookie = prefs.loadCookie("edilayouts");
		var layout;
		var row;
		var column;
		for (layout in cookie) {
			if (cookie[layout].length > 0) layouts[layout] = [];
			for (row = 0; row < cookie[layout].length; row++) {
				layouts[layout][row] = [];
				for (column = 0; column < cookie[layout][row].length; column++) {
					if ((column in cookie[layout][row]) && cookie[layout][row][column] && ("panel" in cookie[layout][row][column]) && (cookie[layout][row][column].panel in panels)) {
						layouts[layout][row][column] = cookie[layout][row][column];
					}
				}
			}
		}
	};

	// TODO: Scrub on save
	that.saveLayouts = function() {
		/*var c = {};
		for (var l in layouts) {
			if (layouts[l].length > 0) c[l] = new Array();
			for (var row = 0; row < layouts[l].length; row++) {
				c[l][row] = [];
				for (var p in layouts[l][row]) {
					c[l][row].push(p);
				}
			}
		}*/
		prefs.saveCookie("edilayouts", layouts);
	};

	that.init = function(container) {
		that.loadLayouts();
		var wantlayout = prefs.getPref("edi", "clayout");
		if (SIDEBAR) {
			clayout = [ [ { "panel": "TimelinePanel", "rowspan": 1, "colspan": 1 } ] ];
			panels.TimelinePanel.height = window.innerHeight;
			
		}
		else if ((wantlayout != "_default") && (wantlayout in layouts)) {
			clayout = layouts[wantlayout];
		}
		else {
			wantlayout = "default";
			layouts['default'] = that.getDefaultLayout();
			clayout = layouts['default'];
		}
		prefs.changePref("edi", "clayout", wantlayout);
		
		// TODO: When adding a callback for the changing the layout, DEFINE THE CALLBACK HERE.
		// Putting it above this mark would cause an unnecessary reflow when starting up the page without cookies.
		
		for (var i in panels) {
			panels[i].EDINAME = i;
		}
		
		that.sizeLayout();
		that.drawGrid(container);
		
		setInterval(that.urlChangeDetect, 200);
	};
	
	that.resetLayout = function(value) {
		if (value) {
			layouts['default'] = that.getDefaultLayout();
			that.saveLayouts();
			prefs.changePref("edi", "clayout", "_default", true);
		}
	};
	
	prefs.addPref("edi", { "hidden": true, "name": "clayout", "defaultvalue": "_default" });
	prefs.addPref("edi", { "name": "resetlayout", "type": "button", "defaultvalue": false, "callback": that.resetLayout, "refresh": true, "sessiononly": true });
	
	//*************************************************************************
	// Sizing/drawing layouts
	
	var colw = [];
	var rowh = [];
	var mincolw = [];
	var minrowh = [];
	var maxcolw = [];
	var maxrowh = [];
	var colflags = [];
	var rowflags = [];
	var layout = [];
	var vborders = [];
	var hborders = [];
	//var cborders = [];

	that.sizeLayout = function() {
		var maxcols = 0;
		for (var i = 0; i < clayout.length; i++) {
			rowh[i] = 0;
			minrowh[i] = 0;
			maxrowh[i] = 10000;
			if (clayout[i].length > maxcols) maxcols = clayout[i].length;
		}

		for (var j = 0; j < maxcols; j++) {
			colw[j] = 0;
			mincolw[j] = 0;
			maxcolw[j] = 10000;
		}
		
		// Step 1: Find out the normal width/height for each column and row and the minimum width/height
		for (var i = 0; i < clayout.length; i++) {
			layout[i] = [];
			for (var j = 0; j < clayout[i].length; j++) {
				if (!clayout[i][j]) {
					layout[i][j] = false;
					continue;
				}
				layout[i][j] = panels[clayout[i][j].panel];
				layout[i][j].rowspan = clayout[i][j].rowspan;
				layout[i][j].colspan = clayout[i][j].colspan;
				if ("width" in clayout[i][j]) layout[i][j].width = clayout[i][j].width;
				if ("height" in clayout[i][j]) layout[i][j].height = clayout[i][j].height;
				layout[i][j].row = i;
				layout[i][j].column = j;
				if (layout[i][j].rowspan == 1) {
					if (rowh[i] < layout[i][j].height) rowh[i] = layout[i][j].height;
					if (minrowh[i] < layout[i][j].minheight) minrowh[i] = layout[i][j].minheight;
					if (layout[i][j].maxheight && (maxrowh[i] > layout[i][j].maxheight)) maxrowh[i] = layout[i][j].maxheight;
				}
				if (layout[i][j].colspan == 1) {
					if (colw[j] < layout[i][j].width) colw[j] = layout[i][j].width;
					if (mincolw[j] < layout[i][j].minwidth) mincolw[j] = layout[i][j].minwidth;
					if (layout[i][j].maxwidth && (maxcolw[j] > layout[i][j].maxwidth)) maxcolw[j] = layout[i][j].maxwidth;
				}
			}
		}
		
		// Step 2: Get how large our current layout is
		var ediwidth = 0;
		var ediheight = 0;
		for (var i = 0; i < layout.length; i++) {
			ediheight += rowh[i];
		}
		for (var j = 0; j < maxcols; j++) {
			ediwidth += colw[j];
		}

		// Step 3: Shrink or expand panels to fit screen
		var xbudget = window.innerWidth - ediwidth;
		var ybudget = window.innerHeight - ediheight;
		
		// Find out which columns and rows are slackable or maxable
		for (var i = 0; i < layout.length; i++) rowflags[i] = "slack";
		for (var j = 0; j < maxcols; j++) colflags[j] = "slack";
		for (var i = 0; i < layout.length; i++) {
			for (var j = 0; j < layout[i].length; j++) {
				if (typeof(layout[i][j]) != "object") continue;
				// Fixed always takes precedence
				if ((rowflags[i] == "fixed") || (layout[i][j].ytype == "fixed")) {
					rowflags[i] = "fixed";
				}
				// max is second in command
				else if ((rowflags[i] == "max") || (layout[i][j].ytype == "max")) {
					rowflags[i] = "max";
				}
				// if we have a fit column, do not use slack space
				else if ((rowflags[i] == "fit") || (layout[i][j].ytype == "fit")) {
					rowflags[i] = "fit";
				}
				// slack is the default flag as a last resort

				if ((colflags[j] == "fixed") || (layout[i][j].xtype == "fixed")) {
					colflags[j] = "fixed";
				}
				else if ((colflags[j] == "max") || (layout[i][j].xtype == "max")) {
					colflags[j] = "max";
				}
				else if ((colflags[j] == "fit") || (layout[i][j].xtype == "fit")) {
					colflags[j] = "fit";
				}
			}
		}
		
		colw = that.getGridSize(colw, mincolw, colflags, xbudget, theme.borderwidth);
		rowh = that.getGridSize(rowh, minrowh, rowflags, ybudget, theme.borderheight);
	};
	
	that.getGridSize = function(sizes, minsizes, flags, budget, bordersize) {
		budget -= bordersize * (sizes.length - 1);
	
		// Find out how many max/slack cells we have
		var nummax = 0;
		var numslack = 0;
		for (var j = 0; j < flags.length; j++) {
			if (flags[j] == "max") nummax++;
			else if (flags[j] == "slack") numslack++;
		}

		// If we've got width to spare, let's maximize any cells
		if ((budget > 0) && (nummax > 0)) {
			var addwidth = Math.floor(budget / nummax);
			var spare = budget - addwidth;		// catch rounding errors!
			for (var j = 0; j < flags.length; j++) {
				if (flags[j] == "max") {
					sizes[j] += addwidth + spare;
					budget -= addwidth - spare;
					spare = 0;
				}
			}
		}
		// Shrink or expand slack space if available
		if ((budget != 0) && (numslack > 0)) {
			var addwidth = Math.floor(budget / numslack);
			var spare = budget - addwidth;
			for (var j = 0; j < flags.length; j++) {
				if (flags[j] == "slack") {
					if ((sizes[j] + addwidth + spare) < minsizes[j]) {
						budget -= (sizes[j] - minsizes[j]);
						sizes[j] = minsizes[j];
					}
					else {
						sizes[j] += (addwidth + spare);
						budget -= (addwidth + spare);
						spare = 0;
					}
				}
			}
		}
		// Shrink all columns.
		if (budget < 0) {
			// Add up the minimum attainable width
			var minwidthtotal = 0;
			for (var j = 0; j < minsizes.length; j++) minwidthtotal += minsizes[j];
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
					var gain = 0;
					for (var j = 0; j < sizes.length; j++) {
						if ((sizes[j] > minsizes[j]) && (minsizes[j] <= largestmin)) {
							shrinkable++;
							gain += (sizes[j] - largestmin);
						}
					}
					if (gain > Math.abs(budget)) gain = Math.abs(budget);
					if (shrinkable > 0) {
						var shrinkeach = Math.floor(gain / shrinkable);
						var spare = gain - (shrinkeach * shrinkable);
						for (var j = 0; j < sizes.length; j++) {
							if ((sizes[j] > minsizes[j]) && (minsizes[j] <= largestmin)) {
								sizes[j] -= shrinkeach - spare;
								spare = 0;
								budget += shrinkeach + spare;
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
				for (var j = 0; j < sizes.length; j++) {
					if (flags[j] != "fixed") {
						sizes[j] -= subwidth - spare;
						budget += subwidth + spare;
						spare = 0;
					}
				}
			}
		}
		
		return sizes;
	};
	
	that.drawGrid = function(element) {
		for (var i = 0; i < layout.length; i++) {
			vborders[i] = new Array();
			hborders[i] = new Array();
			//cborders[i] = new Array();
		}
		var runningy = 0;
		for (var i = 0; i < layout.length; i++) {
			var runningx = 0;
			var borderheight = theme.borderheight;
			for (var j = 0; j < layout[i].length; j++) {
				if (!layout[i][j]) {
					var cellwidth = (layout[i - 1][j].colspan - 1) * theme.borderwidth;
					for (var k = j; k <= (j + layout[i - 1][j].colspan - 1); k++) {
						cellwidth += colw[k];
					}
					runningx += cellwidth + theme.borderwidth;
					continue;
				}
				
				var usevborder = false;
				var usehborder = false;
				var borderwidth = theme.borderwidth;
				var cirregular = (layout[i][j].colspan > 1) || (layout[i][j].colspan > 1) ? true : false;
				if ((j + layout[i][j].colspan) < colflags.length) usevborder = true;
				if ((i + layout[i][j].rowspan) < layout.length) usehborder = true;
				if (panels[layout[i][j].EDINAME].noborder) {
					//usevborder = false;
					usehborder = false;
					//borderwidth = Math.floor(borderwidth / 2);
					borderheight = Math.floor(borderheight / 2);
					rowh[rowh.length - 1] += borderheight;
				}
				
				var cellwidth = (layout[i][j].colspan - 1) * theme.borderwidth;
				for (var k = j; k <= (j + layout[i][j].colspan - 1); k++) cellwidth += colw[k];
				var cellheight = (layout[i][j].rowspan - 1) * theme.borderheight;
				for (var k = i; k <= (i + layout[i][j].rowspan - 1); k++) cellheight += rowh[k];
				
				var dispwidth = (typeof(layout[i][j].initSizeX) == "function") ? layout[i][j].initSizeX(cellwidth, colw[j]) : cellwidth;
				var dispheight = (typeof(layout[i][j].initSizeY) == "function") ? layout[i][j].initSizeY(cellheight, rowh[i]) : cellheight;
				if ((dispwidth != cellwidth) || (dispheight != cellheight)) cirregular = true;

				if (usevborder) {
					vborders[i][j] = {};
					vborders[i][j].el = createEl("div", { "class": "edi_border_vertical" });
					vborders[i][j].el.setAttribute("style", "position: absolute; top: " + runningy + "px; left: " + (runningx + dispwidth) + "px; height: " + cellheight + "px;");
					vborders[i][j].vfirst = (i == 0) ? true : false;
					vborders[i][j].vlast = ((i + (layout[i][j].rowspan - 1)) >= (rowflags.length - 1)) ? true : false;
					var crap = function() {
						var h = j - 1;
						vborders[i][j].el.addEventListener('mousedown', function(e) { that.startColumnResize(e, h + 1); }, true);
					}();
					if (theme.borderVertical) theme.borderVertical(vborders[i][j]);
					element.appendChild(vborders[i][j].el);
				}

				if (usehborder) {
					hborders[i][j] = {}
					hborders[i][j].el = createEl("div", { "class": "edi_border_horizontal" });
					hborders[i][j].el.setAttribute("style", "position: absolute; top: " + (runningy + cellheight) + "px; left: " + runningx + "px; width: " + cellwidth + "px;");
					hborders[i][j].hfirst = (j == 0) ? true : false;
					hborders[i][j].hlast = (j >= (layout[i].length - 1)) ? true : false;
					var crap = function() {
						var h = i - 1;
						hborders[i][j].el.addEventListener('mousedown', function(e) { that.startRowResize(e, h + 1); }, true);
					}();
					if (theme.borderHorizontal) theme.borderHorizontal(hborders[i][j]);
					element.appendChild(hborders[i][j].el);
				}
				
				var panelel = document.createElement("div");
				panelel.setAttribute("style", "position: absolute; width: " + dispwidth + "px; height: " + dispheight + "px;");
				that.openpanels[layout[i][j].EDINAME] = layout[i][j].constructor(panelel);
				var panelcl = layout[i][j].EDINAME;
				panelcl = panelcl.replace(" ", "_");
				panelel.setAttribute("class", "EdiPanel Panel_" + panelcl);
				element.appendChild(panelel);
				that.openpanels[layout[i][j].EDINAME]._fx_x = fx.make(fx.CSSTranslateX, panelel, 250);
				that.openpanels[layout[i][j].EDINAME]._fx_x.set(runningx);
				that.openpanels[layout[i][j].EDINAME]._fx_y = fx.make(fx.CSSTranslateY, panelel, 250);
				that.openpanels[layout[i][j].EDINAME]._fx_y.set(runningy);
				that.openpanels[layout[i][j].EDINAME].height = dispheight;
				that.openpanels[layout[i][j].EDINAME].width = dispwidth;
				that.openpanels[layout[i][j].EDINAME].parent = that;
				that.openpanels[layout[i][j].EDINAME].init();
				
				that.openpanels[layout[i][j].EDINAME]._row = i;
				that.openpanels[layout[i][j].EDINAME]._column = j;
				that.openpanels[layout[i][j].EDINAME]._runningx = runningx;
				that.openpanels[layout[i][j].EDINAME]._runningy = runningy;
				that.openpanels[layout[i][j].EDINAME]._div = panelel;
				
				runningx += cellwidth + borderwidth;
			}
		runningy += rowh[i] + borderheight;
		}
		
		for (i = 0; i < layout.length; i++) {
			for (j = 0; j < layout[i].length; j++) {
				if (typeof(layout[i][j]) != "object") continue;
				if (that.openpanels[layout[i][j].EDINAME].onLoad) that.openpanels[layout[i][j].EDINAME].onLoad();
			}
		}
		
		/*for (var i = 0; i < (layout.length - 1); i++) {
			for (var j = 0; j < (layout[i].length - 1); j++) {
				if (typeof(cborders[i][j]) != "object") continue;
				theme.borderCorner(cborders[i][j]);
			}
		}*/
	};
	
	//*************************************
	//  Resizing
	
	var resize_mx;
	var resize_my;
	var resize_row = false;
	var resize_col = false;
	var resize_last_width = -1;
	var resize_last_height = -1;
	
	that.startRowResize = function(evt, row) {
		if (resize_row !== false) return;
		resize_my = getMousePosY(evt);
		resize_row = row;
		resize_last_height = rowh[row];
		document.addEventListener("mousemove", that.rollingRowResize, false);
		document.addEventListener("mouseup", that.stopRowResize, false);
	};
	
	that.rollingRowResize = function(evt) {
		var my = getMousePosY(evt);
		// TODO: vborders
		var height = rowh[resize_row] + (my - resize_my);
		if (height < minrowh[resize_row]) height = minrowh[resize_row];
		else if (height > maxrowh[resize_row]) {
			height = maxrowh[resize_row];
		}
		if (resize_last_height == height) return;
		var height2 = rowh[resize_row + 1] - (height - rowh[resize_row]);
		if (height2 < minrowh[resize_row + 1]) {
			if ((height + (minrowh[resize_row + 1] - height2)) < minrowh[resize_row]) return;
			height += height2 - minrowh[resize_row + 1];
			height2 = minrowh[resize_row + 1];
		}
		else if (height2 > maxrowh[resize_row + 1]) {
			if ((height + (height2 - maxrowh[resize_row + 1])) > maxrowh[resize_row]) return;
			height -= maxrowh[resize_col + 1] - height2;
			height2 = maxrowh[resize_row + 1];
		}
		var rowdiff = height - rowh[resize_row];
		var rowdiff2 = height2 - rowh[resize_row + 1];
		var y2, j;
		for (var i = 0; i < layout[resize_row].length; i++) {
			if ((typeof(layout[resize_row][i]) == "object") && (typeof(hborders[resize_row][i]) == "object")) {
				hborders[resize_row][i].el.style.top = (that.openpanels[layout[resize_row][i].EDINAME]._runningy + height) + "px";
				that.openpanels[layout[resize_row][i].EDINAME]._div.style.height = height + "px";
			}
		}
		for (i = 0; i < layout[resize_row + 1].length; i++) {
			if (typeof(layout[resize_row + 1][i]) == "object") {
				y2 = that.openpanels[layout[resize_row + 1][i].EDINAME]._runningy - rowdiff2;
				that.openpanels[layout[resize_row + 1][i].EDINAME]._fx_y.set(y2);
				for (j = 2; j <= layout[resize_row + 1][i].rowspan; j++) {
					height2 += rowh[resize_row + j] + theme.borderheight;
				}
				that.openpanels[layout[resize_row + 1][i].EDINAME]._div.style.height = height2 + "px";
			}
		}
		resize_last_height = height;
	};
	
	that.stopRowResize = function(evt) {
		var rowdiff = resize_last_height - rowh[resize_row];
		rowh[resize_row] = resize_last_height;
		rowh[resize_row + 1] = rowh[resize_row + 1] - rowdiff;
		var layoutname = prefs.getPref("edi", "clayout");
		for (var i = 0; i < layout[resize_row].length; i++) {
			if (typeof(layouts[layoutname][resize_row][i]) == "object") {
				layouts[layoutname][resize_row][i].height = rowh[resize_row];
			}
			if (typeof(layout[resize_row][i]) == "object") {
				if (that.openpanels[layout[resize_row][i].EDINAME].onHeightResize) {
					that.openpanels[layout[resize_row][i].EDINAME].onHeightResize(rowh[resize_row]);
				}
			}
		}
		for (i = 0; i < layout[resize_row + 1].length; i++) {
			if (typeof(layouts[layoutname][resize_row + 1][i]) == "object") {
				layouts[layoutname][resize_row + 1][i].height = rowh[resize_row + 1];
			}
			if (typeof(layout[resize_row + 1][i]) == "object") {
				if (that.openpanels[layout[resize_row + 1][i].EDINAME].onHeightResize) {
					that.openpanels[layout[resize_row + 1][i].EDINAME].onHeightResize(rowh[resize_row + 1]);
				}
				that.openpanels[layout[resize_row + 1][i].EDINAME]._runningy += rowdiff;
			}
		}
		document.removeEventListener("mousemove", that.rollingRowResize, false);
		document.removeEventListener("mouseup", that.stopRowResize, false);
		resize_row = false;
		that.saveLayouts();
	};
	
	that.startColumnResize = function(evt, col) {
		if (resize_col !== false) return;
		resize_mx = getMousePosX(evt);
		resize_col = col;
		resize_last_width = colw[col];
		document.addEventListener("mousemove", that.rollingColumnResize, false);
		document.addEventListener("mouseup", that.stopColumnResize, false);
	};
	
	that.rollingColumnResize = function(evt) {
		var mx = getMousePosX(evt);
		var width = colw[resize_col] + (mx - resize_mx);
		if (width < mincolw[resize_col]) width = mincolw[resize_col];
		else if (width > maxcolw[resize_col]) {
			width = maxcolw[resize_col];
		}
		if (resize_last_width == width) return;
		var width2 = colw[resize_col + 1] - (width - colw[resize_col]);
		if (width2 < mincolw[resize_col + 1]) {
			// this if catches a condition where mincolw[resize_col + 1] will expand to cause width to be < mincolw[resize_col]
			if ((width + (mincolw[resize_col + 1] - width2)) < mincolw[resize_col]) return;
			width += width2 - mincolw[resize_col + 1];
			width2 = mincolw[resize_col + 1];
		}
		else if (width2 > maxcolw[resize_col + 1]) {
			if ((width + (width2 - maxcolw[resize_col + 1])) > maxcolw[resize_col]) return;
			width -= maxcolw[resize_col + 1] - width2;
			width2 = maxcolw[resize_col + 1];
		}
		var coldiff = width - colw[resize_col];
		var coldiff2 = width2 - colw[resize_col + 1];
		var x2, h;
		for (var i = 0; i < layout.length; i++) {
			// checking for vborder doubles as a check for colspan
			if ((typeof(layout[i][resize_col]) == "object") && (typeof(vborders[i][resize_col]) == "object")) {
				if (typeof(layout[i][resize_col].onWidthResize) == "function") {
					layout[i][resize_col].onWidthResize(width);
				}
				vborders[i][resize_col].el.style.left = (that.openpanels[layout[i][resize_col].EDINAME]._runningx + width) + "px";
				that.openpanels[layout[i][resize_col].EDINAME].width = width;
				that.openpanels[layout[i][resize_col].EDINAME]._div.style.width = width + "px";
			}
			if (typeof(layout[i][resize_col + 1]) == "object") {
				if (typeof(layout[i][resize_col + 1].onWidthResize) == "function") {
					layout[i][resize_col + 1].onWidthResize(width)
				}
				x2 = that.openpanels[layout[i][resize_col + 1].EDINAME]._runningx - coldiff2;
				that.openpanels[layout[i][resize_col + 1].EDINAME]._fx_x.set(x2);
				for (j = 2; j <= layout[i][resize_col + 1].rowspan; j++) {
					width2 += colw[resize_col + j] + theme.borderwidth;
				}
				that.openpanels[layout[i][resize_col + 1].EDINAME].width = width2;
				that.openpanels[layout[i][resize_col + 1].EDINAME]._div.style.width = width2 + "px";
				if ((typeof(layout[i][resize_col + 1]) == "object") && (typeof(hborders[i][resize_col + 1]) == "object")) {
					hborders[i][resize_col + 1].el.style.left = x2 + "px";
					hborders[i][resize_col + 1].el.style.width = width2 + "px";
				}
			}
		}
		resize_last_width = width;
	};

	that.stopColumnResize = function(evt) {
		var coldiff = resize_last_width - colw[resize_col];
		colw[resize_col] = resize_last_width;
		colw[resize_col + 1] = colw[resize_col + 1] - coldiff;
		var layoutname = prefs.getPref("edi", "clayout");
		for (var i = 0; i < layout.length; i++) {
			if (typeof(layouts[layoutname][i][resize_col]) == "object") {
				layouts[layoutname][i][resize_col].width = colw[resize_col];
			}
			if (typeof(layouts[layoutname][i][resize_col + 1]) == "object") {
				layouts[layoutname][i][resize_col + 1].width = colw[resize_col + 1];
			}
			if (typeof(layout[i][resize_col]) == "object") {
				if (that.openpanels[layout[i][resize_col].EDINAME].afterWidthResize) {
					that.openpanels[layout[i][resize_col].EDINAME].afterWidthResize(colw[resize_col]);
				}
			}
			if (typeof(layout[i][resize_col + 1]) == "object") {
				that.openpanels[layout[i][resize_col + 1].EDINAME]._runningx += coldiff;
				if (that.openpanels[layout[i][resize_col + 1].EDINAME].afterWidthResize) {
					that.openpanels[layout[i][resize_col + 1].EDINAME].afterWidthResize(colw[resize_col + 1]);
				}
			}
		}
		document.removeEventListener("mousemove", that.rollingColumnResize, false);
		document.removeEventListener("mouseup", that.stopColumnResize, false);
		resize_col = false;
		that.saveLayouts();
	};
		
	return that;
}();