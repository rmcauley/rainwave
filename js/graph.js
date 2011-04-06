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
	
	that.makeSVG = function(gfunc, gmaskfunc, width, height, data) {
		var s = svg.make({ width: width, height: height });
		var newgr = that.make(gfunc, gmaskfunc, 0, 0, width, height, data);
		newgr.svg = s;
		newgr.svg.appendChild(newgr.g);
		return newgr;
	};
	
	that.make = function(gfunc, gmaskfunc, x, y, width, height, data) {
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
		/*if (gmaskfunc) {
			graph.defs = svg.makeEl("defs");
			graph.plot = svg.makeEl("mask");
			graph.plot.setAttribute("id", "R3Graph" + gid + "_mask");
			graph.defs.appendChild(graph.plot);
			graph.g.appendChild(graph.defs);
			graph.masked = svg.makeEl("g");
			graph.masked.setAttribute("mask", "url(#R3Graph" + gid + "_mask)");
		}
		else {*/
			graph.plot = svg.makeEl("g");
		//}
		graph.bgrid = svg.makeEl("g");

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
			var i;
			for (i in graph.data.raw) {
				keys.push(i);
			}
			keys.sort();
			
			graph.maxx = graph.data.maxx ? graph.data.maxx : keys[keys.length - 1];
			graph.maxy = graph.data.maxy ? graph.data.maxy : true;
			graph.minx = typeof(graph.data.minx) != "undefined" ? graph.data.minx : 0;
			graph.miny = typeof(graph.data.miny) != "undefined" ? graph.data.miny : 0;
			if (graph.maxy === true) {
				graph.maxy = 0;
				for (i in graph.data.raw) {
					if (graph.data.raw[i] > graph.maxy) graph.maxy = graph.data.raw[i];
				}
				graph.maxy = Math.ceil(graph.maxy / 10) * 10;
			}
			if (graph.minx === true) graph.data.minx = keys[0];
			if (graph.miny === true) {
				graph.miny = graph.data.raw[keys[0]];
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
			//graph.gwidth -= Math.floor((graph.gwidth / numstepsx) / 2);
			//graph.gwidth -= graph.gwidth % Math.floor(graph.gwidth / numstepsx);
			graph.gheight = (graph.height - (graph.height - graph.xendy)) - graph.data.pady;
			//graph.gheight -= Math.floor((graph.gheight / numstepsy) / 2);
			//graph.gheight -= graph.gheight % Math.floor(graph.gheight / numstepsy);
			graph.barwidth = graph.gwidth / numstepsx;
			graph.barheight = graph.gheight / numstepsy;
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
			return Math.round(((xvalue - graph.minx) / (graph.maxx - graph.minx)) * graph.gwidth);
		};
		
		graph.getYPixel = function(yvalue) {
			return Math.round(((1 - ((yvalue - graph.miny) / (graph.maxy - graph.miny))) * graph.gheight) + graph.data.pady);
		};
		
		graph.label();
		graph.scale();
		graph.g.appendChild(graph.bgrid);
		if (gmaskfunc && graph.masked) {
			gmaskfunc(graph, graph.masked);
			graph.g.appendChild(graph.masked);
			graph.masked.setAttribute("transform", "translate(" + graph.ystartx + ",0)");
		}
		else {
			graph.g.appendChild(graph.plot);
			graph.plot.setAttribute("transform", "translate(" + graph.ystartx + ",0)");
		}
		graph.g.appendChild(graph.scalable);
		
		gfunc(graph);
		
		return graph;
	};
	
	that.HLineGraph = function() {};
	
	fx.extend("RatingHistogramBar", function(object, gheight, duration) {
		var rhbfx = {};
		rhbfx.duration = duration;
		
		rhbfx.update = function(now) {
			object.setAttribute("y", now);
			object.setAttribute("height", gheight - now);
		};

		return rhbfx;
	});
	
	that.RatingHistogram = function(graph) {
		graph.data.fx = {};
		graph.data.bars = {};
		graph.update = function(newdata, init) {
			var i, j, found;
			for (i in graph.data.raw) {
				found = false;
				for (j in newdata) {
					if (i == j) found = true;
				}
				if (!found) {
					graph.data.raw[i] = 0;
					graph.plot.removeChild(graph.data.bars[i]);
					delete(graph.data.bars[i]);
					delete(graph.data.fx[i]);
				}
			}
			
			var newkeys = [];
			for (i in newdata) {
				found = false;
				for (j in graph.data.raw) {
					if (i == j) found = true;
				}
				if ((!found) || (init)) {
					graph.plotValue(i, newdata[i]);
				}
			}
			
			if (fx.enabled) setTimeout(graph.animateAll, 100);
			else graph.animateAll();
		};
		
		graph.animateAll = function() {
			for (i in graph.data.raw) {
				graph.data.fx[i].start(graph.getYPixel(graph.data.raw[i]));
			}
		};
		
		graph.plotValue = function(xvalue, yvalue) {
			var x = graph.getXPixel(xvalue);
			graph.data.raw[xvalue] = yvalue;
			if (graph.data.stroke && graph.data.fill) {
				graph.data.bars[xvalue] = svg.makeRect(x - (graph.barwidth / 2) - 0.5, graph.xendy, graph.barwidth - 0.5, 0, { "stroke": graph.data.stroke(x, graph.gheight + graph.data.pady), "stroke-width": "1", "fill": graph.data.fill(x, graph.gheight + graph.data.pady) });
			}
			else {
				graph.data.bars[xvalue] = svg.makeRect(x - (graph.barwidth / 2) - 0.5, graph.xendy, graph.barwidth - 0.5, 0, { "stroke": "#666666", "stroke-width": "1", "fill": "#FFFFFF" });
			}
			graph.data.fx[xvalue] = fx.make(fx.RatingHistogramBar, [ graph.data.bars[xvalue], graph.gheight + graph.data.pady, 250 ]);
			graph.data.fx[xvalue].set(graph.gheight + graph.data.pady);
			graph.plot.appendChild(graph.data.bars[xvalue]);
		};
		
		graph.update(graph.data.raw, true);
	};
	
	fx.extend("LineGraphPoint", function(line, point1, point2, gheight, duration) {
		var lfx = {};
		lfx.duration = duration;
		
		var p1_from_x, p1_from_y;
		lfx.setP1From = function(x, y, x1, y2) {
			p1_from_x = x;
			p1_from_y = y;
		};
		
		var p2_from_x, p2_from_y;
		lfx.setP2From = function(x, y, x1, y2) {
			p2_from_x = x;
			p2_from_y = y;
		};
		
		var p1_to_x, p1_to_y;
		lfx.setP1To = function(x, y, x1, y2) {
			p1_to_x = x;
			p1_to_y = y;
		};
		
		var p2_to_x, p2_to_y;
		lfx.setP2To = function(x, y, x1, y2) {
			p2_to_x = x;
			p2_to_y = y;
		};
		
		lfx.update = function(now) {
			var x1 = p1_from_x - p1_to_x;
			if (x1 != 0) x1 = Math.round(x1 * now) + p1_from_x;
			else x1 = p1_to_x;
			
			var y1 = p1_from_y - p1_to_y;
			if (y1 > 0) y1 = Math.round(y1 * now) + p1_from_y;
			else y1 = p1_from_y;
			
			var x2 = p2_from_x - p2_to_x;
			if (x2 > 0) x2 = Math.round(x2 * now) + p2_from_x;
			else x2 = p2_to_x;
			
			var y2 = p2_from_y - p2_to_y;
			if (y2 > 0) y2 = Math.round(y2 * now) + p2_from_y;
			else y2 = p2_from_y;
			
			line.setAttribute("x1", x1);
			line.setAttribute("y1", y1);
			line.setAttribute("x2", x2);
			line.setAttribute("y2", y2);
			
			point1.setAttribute("x", x1 - 3);
			point1.setAttribute("y", y1 - 3);
			
			point2.setAttribute("x", x2 - 3);
			point2.setAttribute("y", y2 - 3);
			
			// object.setAttribute("y", now);
			// object.setAttribute("height", gheight - now);
		};

		return rhbfx;
	});
	
	that.Line = function(graph) {
		graph.data.fx = {};
		graph.data.lines = {};
		graph.data.points1 = {};
		graph.data.points2 = {};
		
		graph.update = function(newdata, init) {
			var i, j, k, found;
			for (i in graph.data.raw) {
				found = false;
				for (j in newdata) {
					if (i == j) found = true;
				}
				if (!found) {
					graph.data.raw[i] = 0;
					graph.plot.removeChild(graph.data.lines[i]);
					graph.plot.removeChild(graph.data.points1[i]);
					delete(graph.data.lines[i]);
					delete(graph.data.points[i]);
					delete(graph.data.fx[i]);
				}
			}
			
			var keys = [];
			for (i in newdata) {
				keys.push(i);
			}
			keys.sort();
			
			var lastx = graph.minx;
			var lasty = newdata[keys[0]];
			for (k = 0; k < keys.length; k++) {
				i = keys[k];
				found = false;
				for (j in graph.data.raw) {
					if (i == j) found = true;
				}
				if ((!found) || (init)) {
					graph.plotValue(i, newdata[i], lastx, lasty);
				}
				lastx = i;
				lasty = newdata[i];
			}
			
			if (fx.enabled) setTimeout(graph.animateAll, 100);
			else graph.animateAll();
		};
		
		graph.animateAll = function() {
			/*for (i in graph.data.raw) {
				graph.data.fxx[i].start(graph.getXPixel(i));
				graph.data.fxy[i].start(graph.getYPixel(graph.data.raw[i]));
			}*/
		};

		graph.plotValue = function(xvalue, yvalue, lastx, lasty) {
			var x1 = graph.getXPixel(lastx);
			var y1 = graph.getYPixel(lasty);
			var x2 = graph.getXPixel(xvalue);
			var y2 = graph.getYPixel(yvalue);
			graph.data.raw[xvalue] = yvalue;
			var fill = "#FFF";
			var stroke = "#BBB";
			if (graph.data.fill && graph.data.stroke) {
				//stroke = graph.data.stroke(xvalue / graph.maxx, yvalue / graph.maxy);
				fill = graph.data.fill(xvalue / graph.maxx, yvalue / graph.maxy);
			}
			graph.data.lines[xvalue] = svg.makeLine(x1, y1, x2, y2, { "stroke": stroke, "stroke-width": 2 });
			graph.data.points1[xvalue] = svg.makeRect(x1 - 3, y1 - 3, 6, 6, { "fill": fill });
			graph.data.points2[xvalue] = svg.makeRect(x2 - 3, y2 - 3, 6, 6, { "fill": fill });

			graph.plot.appendChild(graph.data.lines[xvalue]);
			graph.plot.appendChild(graph.data.points1[xvalue]);
			graph.plot.appendChild(graph.data.points2[xvalue]);
		};
		
		graph.update(graph.data.raw, true);
	};

	return that;
}();