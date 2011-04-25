var graph = function() {
	if (!svg.capable) return false;
	var that = {};
	var gid = 0;
	
	var svgdefs = svg.make( { style: "position: absolute;", "width": 0, "height": 0 } );
	var defs = svg.makeEl("defs");
	theme.graphDefs(svgdefs, defs);
	svgdefs.appendChild(defs);
	document.getElementById("body").appendChild(svgdefs);
	
	that.extend = function(name, func) {
		that[name] = func;
	};
	
	that.makeSVG = function(gfunc, width, height, data) {
		var s = svg.make({ width: width, height: height });
		var newgr = that.make(gfunc, 0, 0, width, height, data);
		newgr.svg = s;
		newgr.svg.appendChild(newgr.g);
		return newgr;
	};
	
	that.make = function(gfunc, x, y, width, height, data) {
		var graph = {};
		if (!data.xnumbermod) data.xnumbermod = false;
		if (!data.ynumbermod) data.ynumbermod = false;
		graph.gid = parseInt(gid);
		gid++;
		graph.width = width;
		graph.height = height;
		graph.data = data;
		graph.ystartx = 0;
		graph.xendy = height;
		graph.g = svg.makeEl("g");
		if (x || y) graph.g.setAttribute("transform", "translate(" + x + ", " + y + ")");
		graph.scalable = svg.makeEl("g");
		graph.bgrid = svg.makeEl("g");
		graph.plots = [];

		graph.label = function() {
			if (graph.data.xlabel) {
				var xlabelx = ((graph.width - (UISCALE * 2)) / 2) - (measureText(graph.data.xlabel) / 2) + (UISCALE * 2);
				var xlabel = svg.makeEl("text", { x: xlabelx, y: graph.height - (UISCALE * .3), fill: theme.textcolor });
				xlabel.textContent = graph.data.xlabel;
				graph.g.appendChild(xlabel);
				graph.xendy -= UISCALE;
			}
			
			if (graph.data.ylabel) {
				var ylabely = graph.height - UISCALE - measureText(graph.data.ylabel);
				var ylabel = svg.makeEl("text", { x: 0, y: ylabely + UISCALE, fill: theme.textcolor, transform: "rotate(-90, 0, " + ylabely + ")" });
				ylabel.textContent = graph.data.ylabel;
				graph.g.appendChild(ylabel);
				graph.ystartx += UISCALE + (UISCALE * .3);
			}
		};
		
		graph.scale = function() {			
			var keys = [];
			var i, j;
			var p_miny = 1000000000;		// potential min y
			for (i in graph.data.raw) {
				for (j in graph.data.raw[i]) {
					keys.push(j);
					if (graph.data.raw[i][j] < p_miny) p_miny = graph.data.raw[i][j];
				}
			}
			keys.sort();
			
			graph.maxx = graph.data.maxx ? graph.data.maxx : keys[keys.length - 1];
			graph.maxy = graph.data.maxy ? graph.data.maxy : true;
			graph.minx = typeof(graph.data.minx) != "undefined" ? graph.data.minx : 0;
			graph.miny = typeof(graph.data.miny) != "undefined" ? graph.data.miny : 0;
			if (graph.maxy === true) {
				graph.maxy = 0;
				for (i in graph.data.raw) {
					for (j in graph.data.raw[i]) {
						if (graph.data.raw[i][j] > graph.maxy) graph.maxy = graph.data.raw[i][j];
					}
				}
				graph.maxy = Math.ceil(graph.maxy / 10) * 10;
			}
			if (graph.minx === true) graph.data.minx = keys[0];
			if (graph.miny === true) {
				graph.miny = p_miny;
				graph.miny = Math.floor(graph.miny - ((graph.maxy - graph.miny) * 0.1));
				if (graph.miny < 0) graph.miny = 0;
				if (graph.miny == graph.maxy) graph.miny = 0;
			}
			if (!graph.data.padx) {
				if (graph.data.xnonumbers) graph.data.padx = 0;
				else graph.data.padx = UISCALE;
			}
			if (!graph.data.pady) {
				if (graph.data.ynonumbers) graph.data.pady = 0;
				else graph.data.pady = UISCALE;
			}
			// by this point, we have the "real" miny/maxy numbers as defined by options or the graph data
			// it has not been changed in any way
			
			// This next block determines the starting X pixel of the Y legend and the ending (bottom) Y pixel of the X legends
			if (!graph.data.ynonumbers) graph.ystartx += Math.floor(measureText(graph.data.yprecision ? graph.maxy.toFixed(graph.data.yprecision) : Math.round(graph.maxy)));
			else graph.ystartx = 1;
			if (!graph.data.xnonumbers) graph.xendy -= Math.floor(UISCALE * 1.5);
			else graph.xendy--;
			
			// Number of background grid and legend markings
			var stepsx = graph.data.stepsx ? graph.data.stepsx : 10;
			var stepsy = graph.data.stepsy ? graph.data.stepsy : 5;
			// If more steps than numbers, make the number of steps whole numbers
			if (stepsy > graph.maxy) stepsy = graph.maxy;
			// Determine the number of x/y values to step for each grid/legend.  THIS IS NOT IN PIXELS.
			var stepdeltax = graph.data.stepdeltax ? graph.data.stepdeltax : (graph.maxx - graph.minx) / stepx;
			var stepdeltay = graph.data.stepdeltay ? graph.data.stepdeltay : (graph.maxy - graph.miny) / stepsy;
			// Number of steps that need to be done.
			var numstepsx = (graph.maxx - graph.minx) / stepdeltax;
			var numstepsy = (graph.maxy - graph.miny) / stepdeltay;
			// Now we begin shrinking the actual area for graph data to create some padding.
			graph.gwidth = (graph.width - graph.ystartx) - graph.data.padx;
			graph.gheight = (graph.height - (graph.height - graph.xendy)) - graph.data.pady;
			// Variable for bar graphs.
			graph.barwidth = graph.gwidth / numstepsx;
			var steptext;
			var stepline;
			
			// Render angled line separating Y and X minimum values
			var runningx = graph.ystartx;
			if (((graph.minx !== 0) || (graph.miny !== 0)) && (!graph.data.xnonumbers && !graph.data.ynonumbers) && (!graph.data.xnomin && !graph.data.ynomin)) {
				graph.scalable.appendChild(svg.makeLine(graph.ystartx, graph.xendy, 3, height - 3, { stroke_width: 1, stroke: theme.vdarktext }));
			}
			// Render minimum X value
			if (((graph.minx !== 0) || (graph.miny !== 0)) && !graph.data.xnonumbers && !graph.data.xnomin) {
				steptext = svg.makeEl("text", { x: graph.ystartx + 2, y: graph.xendy + UISCALE + 2, fill: theme.vdarktext, text_anchor: "middle", style: "font-size: 0.7em" });
				//if (graph.maxx >= (keys[0] + 10)) steptext.textContent = keys[0];
				steptext.textContent = (graph.data.xprecision) ? graph.minx.toFixed(graph.data.xprecision) : Math.floor(graph.minx);
				graph.scalable.appendChild(steptext);
			}
			// Render grid lines and legend numbers along the X axis
			for (i = stepdeltax + graph.minx; i <= graph.maxx; i += stepdeltax) {
				runningx += graph.gwidth / numstepsx;
				if (!graph.data.xnonumbers && (!graph.data.xnumbermod || (i % graph.data.xnumbermod == 0))) {
					steptext = svg.makeEl("text", { x: runningx, y: graph.xendy + UISCALE * 1.2, fill: theme.textcolor, text_anchor: "middle" });
					steptext.textContent = (graph.data.xprecision) ? i.toFixed(graph.data.xprecision) : Math.floor(i);
					graph.scalable.appendChild(steptext);
				}
				stepline = svg.makeLine(runningx, graph.xendy, runningx, 0, { stroke: theme.vdarktext, stroke_width: 1 });
				graph.bgrid.appendChild(stepline);
			}
			
			// Render Y minimum text
			var runningy = graph.xendy;
			if (((graph.minx !== 0) || (graph.miny !== 0)) && !graph.data.ynonumbers && !graph.data.ynomin) {
				var zerotexty = graph.data.xnonumbers ? runningy : runningy + (UISCALE * 0.3);
				steptext = svg.makeEl("text", { x: graph.ystartx - 2, y: zerotexty, fill: theme.vdarktext, text_anchor: "end", style: "font-size: 0.7em" });
				if (typeof(graph.data.miny) != "undefined") steptext.textContent = graph.miny;
				//else if (graph.maxy > (graph.data.raw[keys[0]] + 10)) steptext.textContent = graph.data.raw[keys[0]];
				else steptext.textContent = graph.data.yprecision ? graph.miny.toFixed(graph.data.yprecision) : Math.floor(graph.miny);				
				graph.scalable.appendChild(steptext);
			}
			// Render Y grid lines
			for (i = stepdeltay + graph.miny; i <= graph.maxy; i += stepdeltay) {
				runningy -= graph.gheight / numstepsy;
				if (!graph.data.ynonumbers && (!graph.data.ynumbermod || (i % graph.data.ynumbermod == 0))) {
					steptext = svg.makeEl("text", { x: graph.ystartx, y: runningy + (UISCALE * 0.5), fill: theme.textcolor, text_anchor: "end" });
					if ((i == graph.maxy) || (graph.maxy < 50)) steptext.textContent = (graph.data.yprecision) ? i.toFixed(graph.data.yprecision) : Math.floor(i);
					else steptext.textContent = (graph.data.yprecision) ? i.toFixed(graph.data.yprecision) : Math.floor(i / 10) * 10;
					graph.scalable.appendChild(steptext);
				}
				stepline = svg.makeLine(graph.ystartx, runningy, graph.width, runningy, { stroke: theme.vdarktext, stroke_width: 1 });
				graph.bgrid.appendChild(stepline);
			}
			
			// Render border lines last
			var bordery = svg.makeLine(graph.ystartx, 0, graph.ystartx, graph.xendy, { shape_rendering: "crispEdges", stroke: theme.textcolor, stroke_width: 1 } );
			var borderx = svg.makeLine(graph.ystartx, graph.xendy, graph.width, graph.xendy, { shape_rendering: "crispEdges", stroke: theme.textcolor, stroke_width: 1 } );
			graph.scalable.appendChild(bordery);
			graph.scalable.appendChild(borderx);
		};
		
		graph.getXPixel = function(xvalue) {
			return (((xvalue - graph.minx) / (graph.maxx - graph.minx)) * graph.gwidth);
		};
		
		graph.getYPixel = function(yvalue) {
			return (((1 - ((yvalue - graph.miny) / (graph.maxy - graph.miny))) * graph.gheight) + graph.data.pady);
		};
		
		graph.update = function(newdata, init) {
			var g, i, j, k, found;
			for (var g = 0; g < newdata.length; g++) {
				if (typeof(graph.data.raw[g]) == "undefined") {
					graph.data.raw[g] = [];
				}
				if (typeof(graph.plots[g]) == "undefined") {
					graph.plots[g] = svg.makeEl("g");
					graph.plots[g].setAttribute("transform", "translate(" + graph.ystartx + ",0)");
					graph.g.appendChild(graph.plots[g]);
				}
				
				for (i in graph.data.raw[g]) {
					found = false;
					for (j in newdata[g]) {
						if (i == j) found = true;
					}
					if (!found) graph.removePoint(g, i);
				}
			
				var keys = [];
				for (i in newdata[g]) {
					keys.push(i);
				}
				keys.sort();
				
				var lastx = false;
				var lasty = false;
				for (k = 0; k < keys.length; k++) {
					i = keys[k];
					found = false;
					for (j in graph.data.raw[g]) {
						if (i == j) found = true;
					}
					if ((!found) || (init)) {
						graph.plotValue(g, i, newdata[g][i], lastx, lasty);
					}
					lastx = i;
					lasty = newdata[g][i];
				}
			}
			if (graph.data.raw.length > newdata.length) {
				graph.removeLastPlots(g, graph.data.raw.length - newdata.length);
				for (i = newdata.length; i < graph.data.raw.length; i++) {
					graph.g.removeChild(graph.plots[g]);
				}
			}
			
			graph.data.raw = newdata;
			if (fx.enabled) setTimeout(graph.animateAll, 100);
			else graph.animateAll();
		};
		
		graph.label();
		graph.scale();
		graph.g.appendChild(graph.bgrid);
		graph.g.appendChild(graph.scalable);
		
		gfunc(graph);
		graph.update(graph.data.raw, true);
		
		return graph;
	};
	
	fx.extend("RatingHistogramBar", function(object, gheight, duration) {
		var rhbfx = {};
		rhbfx.duration = duration;
		
		rhbfx.update = function(now) {
			object.setAttribute("y", now);
			if ((gheight - now - 1) > 0) object.setAttribute("height", gheight - now - 1);
			else object.setAttribute("height", 0);
		};

		return rhbfx;
	});
	
	that.RatingHistogram = function(graph) {
		graph.data.fx = [];
		graph.data.bars = [];
		for (var i = 0; i < graph.data.raw.length; i++) {
			graph.data.fx[i] = {};
			graph.data.bars[i] = {};
		}
		
		graph.removePoint = function(g, i) {
			graph.plots[g].removeChild(graph.data.bars[g][i]);
			delete(graph.data.bars[g][i]);
			delete(graph.data.fx[g][i]);
		};
		
		graph.removePlot = function(g, numplots) {
			graph.data.fx.splice(g, numplots);
			graph.data.bars.splice(g, numplots);
		};
		
		graph.animateAll = function() {
			var g, i;
			for (g in graph.data.raw) {
				for (i in graph.data.raw[g]) {
					graph.data.fx[g][i].start(graph.getYPixel(graph.data.raw[g][i]));
				}
			}
		};
		
		graph.plotValue = function(g, xvalue, yvalue) {
			var x = graph.getXPixel(xvalue);
			graph.data.raw[g][xvalue] = yvalue;
			if (graph.data.fill) {
				graph.data.bars[g][xvalue] = svg.makeRect(x - (graph.barwidth / 2) - 1, graph.xendy, graph.barwidth - 0.5, 0, { "fill": graph.data.fill(xvalue, graph.gheight + graph.data.pady) });
			}
			else {
				graph.data.bars[g][xvalue] = svg.makeRect(x - (graph.barwidth / 2) - 1, graph.xendy, graph.barwidth - 0.5, 0, { "fill": "#FFFFFF" });
			}
			graph.data.fx[g][xvalue] = fx.make(fx.RatingHistogramBar, [ graph.data.bars[g][xvalue], graph.gheight + graph.data.pady, 250 ]);
			graph.data.fx[g][xvalue].set(graph.gheight + graph.data.pady);
			graph.plots[g].appendChild(graph.data.bars[g][xvalue]);
		};
	};

	fx.extend("LineGraphLine", function(line, duration) {
		var lfx = {};
		lfx.duration = duration;
		
		var p1_from_x, p1_from_y;
		var p2_from_x, p2_from_y;
		lfx.setFrom = function(x, y, x2, y2) {
			p1_from_x = x;
			p1_from_y = y;
			p2_from_x = x2;
			p2_from_y = y2;
		};
		
		var p1_to_x, p1_to_y;
		var p2_to_x, p2_to_y;
		lfx.setTo = function(x, y, x2, y2) {
			p1_to_x = x;
			p1_to_y = y;
			p2_to_x = x2;
			p2_to_y = y2;
		};

		lfx.onComplete = function(now) {
			lfx.setFrom(p1_to_x, p1_to_y, p2_to_x, p2_to_y);
		};
		
		lfx.update = function(now) {
			var x1 = p1_from_x - p1_to_x;
			if (x1 != 0) x1 = p1_from_x - Math.round(x1 * now);
			else x1 = p1_to_x;
			
			var y1 = p1_from_y - p1_to_y;
			if (y1 > 0) y1 = p1_from_y - Math.round(y1 * now);
			else y1 = p1_from_y;
			
			var x2 = p2_from_x - p2_to_x;
			if (x2 > 0) x2 = p2_from_x - Math.round(x2 * now);
			else x2 = p2_to_x;
			
			var y2 = p2_from_y - p2_to_y;
			if (y2 > 0) y2 = p2_from_y - Math.round(y2 * now);
			else y2 = p2_from_y;
			
			line.setAttribute("x1", x1);
			line.setAttribute("y1", y1);
			line.setAttribute("x2", x2);
			line.setAttribute("y2", y2);
		};

		return lfx;
	});
	
	that.Line = function(graph) {
		graph.data.fx_l = [];
		graph.data.fx_py = [];
		graph.data.fx_px = [];
		graph.data.lines = [];
		graph.data.points = [];
		for (var i = 0; i < graph.data.raw.length; i++) {
			graph.data.fx_l[i] = {};
			graph.data.fx_py[i] = {};
			graph.data.fx_px[i] = {};
			graph.data.lines[i] = {};
			graph.data.points[i] = {};
		}
		
		graph.removePoint = function(g, i) {
			graph.plots[g].removeChild(graph.data.lines[g][i]);
			graph.plots[g].removeChild(graph.data.points[g][i]);
			delete(graph.data.raw[g][i]);
			delete(graph.data.lines[g][i]);
			delete(graph.data.points[g][i]);
			delete(graph.data.fx_l[g][i]);
			delete(graph.data.fx_py[g][i]);
			delete(graph.data.fx_px[g][i]);
		};
		
		graph.removeLastPlots = function(g, numplots) {
			graph.data.lines.splice(g, numplots);
			graph.data.points.splice(g, numplots);
			graph.data.fx_l.splice(g, numplots);
			graph.data.fx_py.splice(g, numplots);
			graph.data.fx_px.splice(g, numplots);
		};
		
		graph.animateAll = function() {
			var lastx = false;
			var lasty = false;
			var g, i, j, x, y;
			for (g in graph.data.raw) {
				var keys = [];
				for (i in graph.data.raw[g]) {
					keys.push(i);
				}
				keys.sort();
				for (j = 0; j < keys.length; j++) {
					i = keys[j];
					x = graph.getXPixel(i);
					y = graph.getYPixel(graph.data.raw[g][i]);
					if (lastx && lasty && graph.data.fx_l[g][i]) {
						graph.data.fx_l[g][i].setTo(lastx, lasty, x, y);
						graph.data.fx_l[g][i].set(0);
						graph.data.fx_l[g][i].start(1);
					}
					graph.data.fx_px[g][i].start(x - 3);
					graph.data.fx_py[g][i].start(y - 3);
					lastx = x;
					lasty = y;
				}
			}
		};

		graph.plotValue = function(g, xvalue, yvalue, lastx, lasty) {
			var x2 = graph.getXPixel(xvalue);
			var y2 = graph.getYPixel(yvalue);
			var fill = "#FFF";
			if (graph.data.fill) {
				fill = graph.data.fill(g, xvalue / graph.maxx, yvalue / graph.maxy);
			}
			graph.data.points[g][xvalue] = svg.makeRect(x2 - 3, graph.gheight + graph.data.pady - 3, 6, 6, { "fill": fill });
			graph.data.fx_px[g][xvalue] = fx.make(fx.SVGAttrib, [ graph.data.points[g][xvalue], 250, "x", "" ]);
			graph.data.fx_px[g][xvalue].set(x2 - 3);
			graph.data.fx_py[g][xvalue] = fx.make(fx.SVGAttrib, [ graph.data.points[g][xvalue], 250, "y", "" ]);
			graph.data.fx_py[g][xvalue].set(graph.gheight + graph.data.pady - 6);
			
			if (lastx && lasty) {
				var x1 = graph.getXPixel(lastx);
				var stroke = "#BBB";
				if (graph.data.stroke) {
					stroke = graph.data.stroke(g, xvalue / graph.maxx, yvalue / graph.maxy);
				}
				graph.data.lines[g][xvalue] = svg.makeLine(x1, graph.gheight + graph.data.pady, x2, graph.gheight + graph.data.pady, { "stroke": stroke, "stroke-width": 2 });
				graph.plots[g].appendChild(graph.data.lines[g][xvalue]);
				graph.data.fx_l[g][xvalue] = fx.make(fx.LineGraphLine, [ graph.data.lines[g][xvalue], 250 ]);
				graph.data.fx_l[g][xvalue].setFrom(x1, graph.gheight + graph.data.pady, x2, graph.gheight + graph.data.pady);
			}
			
			graph.plots[g].appendChild(graph.data.points[g][xvalue]);
		};
	};

	return that;
}();