function EdiLayout(layout, name, parent) {
	var colw = new Array();
	var rowh = new Array();
	var mincolw = new Array();
	var minrowh = new Array();
	var colflags = new Array();
	var rowflags = new Array();	
	var vborders = new Array();
	var hborders = new Array();
	
	var that = {};
	
	that.openpanels = new Array();

	that.sizeLayout = function() {
		var maxcols = 0;
		for (var i = 0; i < layout.length; i++) {
			rowh[i] = 0;
			minrowh[i] = 0;
			if (layout[i].length > maxcols) maxcols = layout[i].length;
		}

		for (var j = 0; j < maxcols; j++) {
			colw[j] = 0;
			mincolw[j] = 0;
		}
		
		// Step 1: Find out the normal width/height for each column and row and the minimum width/height
		for (var i = 0; i < layout.length; i++) {
			for (var j = 0; j < layout[i].length; j++) {
				if (typeof(layout[i][j]) != "object") continue;
				layout[i][j].row = i;
				layout[i][j].column = j;
				if (rowh[i] < layout[i][j].height) rowh[i] = layout[i][j].height;
				if (minrowh[i] < layout[i][j].minheight) minrowh[i] = layout[i][j].minheight;
				if (colw[j] < layout[i][j].width) colw[j] = layout[i][j].width;
				if (mincolw[j] < layout[i][j].minwidth) mincolw[j] = layout[i][j].minwidth;
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
		
		colw = that.getGridSize(colw, mincolw, colflags, xbudget, parent.themeobj.borderwidth);
		rowh = that.getGridSize(rowh, minrowh, rowflags, ybudget, parent.themeobj.borderheight);

		for (var i = 0; i < layout.length; i++) {
			for (var j = 0; j < layout[i].length; j++) {
				if (typeof(layout[i][j]) != "object") continue;
				var k = j + 1;
				layout[i][j].colspan = 1;
				layout[i][j].rowspan = 1;
				while ((k < maxcols) && !layout[i][k]) {
					layout[i][j].colspan++;
					layout[i][k] = true;
					k++;		
				}
				if (layout[i][j].rowspannable) {
					k = i + 1;
					while ((k < layout.length) && !layout[k][j]) {
						layout[i][j].rowspan++;
						layout[k][j] = "rowspan";
						k++;
					}
				}
			}
		}
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
			var borderheight = parent.themeobj.borderheight;
			for (var j = 0; j < layout[i].length; j++) {
				if (!layout[i][j]) continue;
				if (layout[i][j] === "rowspan") {
					var cellwidth = (layout[i - 1][j].colspan - 1) * parent.themeobj.borderwidth;
					for (var k = j; k <= (j + layout[i - 1][j].colspan - 1); k++) {
						cellwidth += colw[k];
					}
					runningx += cellwidth + parent.themeobj.borderwidth;
				}
				if (typeof(layout[i][j]) != "object") continue;
				
				var usevborder = false;
				var usehborder = false;
				var borderwidth = parent.themeobj.borderwidth;
				var cirregular = (layout[i][j].colspan > 1) || (layout[i][j].colspan > 1) ? true : false;
				if ((j + layout[i][j].colspan) < colflags.length) usevborder = true;
				if ((i + layout[i][j].rowspan) < layout.length) usehborder = true;
				if (panels[layout[i][j].intitle].noborder) {
					//usevborder = false;
					usehborder = false;
					//borderwidth = Math.floor(borderwidth / 2);
					borderheight = Math.floor(borderheight / 2);
					rowh[rowh.length - 1] += borderheight;
				}
				
				var cellwidth = (layout[i][j].colspan - 1) * parent.themeobj.borderwidth;
				for (var k = j; k <= (j + layout[i][j].colspan - 1); k++) cellwidth += colw[k];
				var cellheight = (layout[i][j].rowspan - 1) * parent.themeobj.borderheight;
				for (var k = i; k <= (i + layout[i][j].rowspan - 1); k++) cellheight += rowh[k];
				
				var dispwidth = (typeof(layout[i][j].initSizeX) == "function") ? layout[i][j].initSizeX(cellwidth, colw[j]) : cellwidth;
				var dispheight = (typeof(layout[i][j].initSizeY) == "function") ? layout[i][j].initSizeY(cellheight, rowh[i]) : cellheight;
				if ((dispwidth != cellwidth) || (dispheight != cellheight)) cirregular = true;

				/*vborders[i][j] = {};
				vborders[i][j].el = createEl("div", { "class": "edi_border_vertical" });
				vborders[i][j].el.setAttribute("style", "position: absolute; top: " + runningy + "px; left: " + (runningx + dispwidth) + "px; width: " + parent.themeobj.borderwidth + "px; height: " + dispheight + "px;");
				vborders[i][j].vfirst = (i == 0) ? true : false;
				vborders[i][j].vlast = ((i + (layout[i][j].rowspan - 1)) >= (rowflags.length - 1)) ? true : false;
				if (usevborder) {
					parent.themeobj.borderVertical(vborders[i][j]);
					element.appendChild(vborders[i][j].el);
				}
				
				hborders[i][j] = {}
				hborders[i][j].el = createEl("div", { "class": "edi_border_horizontal" });
				hborders[i][j].el.setAttribute("style", "position: absolute; top: " + (runningy + dispheight) + "px; left: " + runningx + "px; width: " + dispwidth + "px; height: " + parent.themeobj.borderheight + "px;");
				hborders[i][j].hfirst = (j == 0) ? true : false;
				hborders[i][j].hlast = (j >= (layout[i].length - 1)) ? true : false;
				if (usehborder) {
					parent.themeobj.borderHorizontal(hborders[i][j]);
					element.appendChild(hborders[i][j].el);
				}*/
				
				var panelel = document.createElement("div");
				panelel.row = i;
				panelel.column = j;
				panelel.setAttribute("style", "position: absolute; top: " + runningy + "px; left:" + runningx + "px; width: " + dispwidth + "px; height: " + dispheight + "px;");
				that.openpanels[layout[i][j].intitle] = layout[i][j].constructor(parent, panelel);
				var panelcl = layout[i][j].intitle;
				panelcl = panelcl.replace(" ", "_");
				panelel.setAttribute("class", "EdiPanel Panel_" + panelcl);
				element.appendChild(panelel);
				that.openpanels[layout[i][j].intitle].init();
				
				runningx += cellwidth + borderwidth;
			}
		runningy += rowh[i] + borderheight;
		}
		
		for (i = 0; i < layout.length; i++) {
			for (j = 0; j < layout[i].length; j++) {
				if (typeof(layout[i][j]) != "object") continue;
				if (that.openpanels[layout[i][j].intitle].onLoad) that.openpanels[layout[i][j].intitle].onLoad();
			}
		}
		
		/*for (var i = 0; i < (layout.length - 1); i++) {
			for (var j = 0; j < (layout[i].length - 1); j++) {
				if (typeof(cborders[i][j]) != "object") continue;
				parent.themeobj.borderCorner(cborders[i][j]);
			}
		}*/
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
	
	return that;
}
