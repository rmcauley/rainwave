function R3Graph() {
	var that = {};
	var gid = 0;
	
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
		if (gmaskfunc) {
			graph.defs = svg.makeEl("defs");
			graph.plot = svg.makeEl("mask");
			graph.plot.setAttribute("id", "R3Graph" + gid + "_mask");
			graph.defs.appendChild(graph.plot);
			graph.g.appendChild(graph.defs);
			graph.masked = svg.makeEl("g");
			graph.masked.setAttribute("mask", "url(#R3Graph" + gid + "_mask)");
		}
		else {
			graph.plot = svg.makeEl("g");
		}
		graph.bgrid = svg.makeEl("g");

		graph.label = function() {
			if (graph.data.xlabel) {
				var xlabelx = ((graph.width - (svg.em * 2)) / 2) - (measureText(graph.data.xlabel) / 2) + (svg.em * 2);
				var xlabel = svg.makeEl("text", { x: xlabelx, y: graph.height - (svg.em * .3), fill: theme.textcolor });
				xlabel.textContent = graph.data.xlabel;
				graph.g.appendChild(xlabel);
				graph.xendy -= svg.em;
			}
			
			if (graph.data.ylabel) {
				var ylabely = graph.height - svg.em - measureText(graph.data.ylabel);
				var ylabel = svg.makeEl("text", { x: 0, y: ylabely + svg.em, fill: theme.textcolor, transform: "rotate(-90, 0, " + ylabely + ")" });
				ylabel.textContent = graph.data.ylabel;
				graph.g.appendChild(ylabel);
				graph.ystartx += svg.em + (svg.em * .3);
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
			graph.minx = graph.data.minx ? graph.data.minx : 0;
			graph.miny = graph.data.miny ? graph.data.miny : 0;
			if (graph.maxy === true) {
				graph.maxy = 0;
				for (i in graph.data.raw) {
					if (graph.data.raw[i] > graph.maxy) graph.maxy = graph.data.raw[i];
				}
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
				else graph.data.padx = svg.em;
			}
			if (!graph.data.pady) {
				if (graph.data.ynonumbers) graph.data.pady = 0;
				else graph.data.pady = svg.em;
			}
			// by this point, we have the "real" miny/maxy numbers as defined by options or the graph data
			// it has not been changed in any way
			
			// This next block determines the starting X pixel of the Y legend and the ending (bottom) Y pixel of the X legends
			if (!graph.data.ynonumbers) graph.ystartx += Math.floor(measureText(graph.data.yprecision ? graph.maxy.toFixed(graph.data.yprecision) : Math.round(graph.maxy)));
			else graph.ystartx = 1;
			if (!graph.data.xnonumbers) graph.xendy -= Math.floor(svg.em * 1.5);
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
			if (((graph.minx !== 0) || (graph.miny !== 0)) && !graph.data.xnonumbers && !graph.data.ynonumbers) {
				graph.scalable.appendChild(svg.makeLine(graph.ystartx, graph.xendy, 3, height - 3, { stroke_width: 1, stroke: theme.vdarktext }));
			}
			// Render minimum X value
			if (((graph.minx !== 0) || (graph.miny !== 0)) && !graph.data.xnonumbers) {
				steptext = svg.makeEl("text", { x: graph.ystartx + 2, y: graph.xendy + svg.em + 2, fill: theme.vdarktext, text_anchor: "middle", style: "font-size: 0.7em" });
				if (graph.maxx >= (keys[0] + 10)) steptext.textContent = keys[0];
				else steptext.textContent = (graph.data.xprecision) ? graph.minx.toFixed(graph.data.xprecision) : Math.floor(graph.minx);
				graph.scalable.appendChild(steptext);
			}
			// Render grid lines and legend numbers along the X axis
			for (i = stepdeltax + graph.minx; i <= graph.maxx; i += stepdeltax) {
				runningx += graph.gwidth / numstepsx;
				if (!graph.data.xnonumbers && (!graph.data.xnumbermod || (i % graph.data.xnumbermod == 0))) {
					steptext = svg.makeEl("text", { x: runningx, y: graph.xendy + svg.em * 1.2, fill: theme.textcolor, text_anchor: "middle" });
					steptext.textContent = (graph.data.xprecision) ? i.toFixed(graph.data.xprecision) : Math.floor(i);
					graph.scalable.appendChild(steptext);
				}
				stepline = svg.makeLine(runningx, graph.xendy, runningx, 0, { stroke: theme.vdarktext, stroke_width: 1 });
				graph.bgrid.appendChild(stepline);
			}
			
			// Render Y minimum text
			var runningy = graph.xendy;
			if (((graph.minx !== 0) || (graph.miny !== 0)) && !graph.data.ynonumbers) {
				var zerotexty = graph.data.xnonumbers ? runningy : runningy + (svg.em * 0.3);
				steptext = svg.makeEl("text", { x: graph.ystartx - 2, y: zerotexty, fill: theme.vdarktext, text_anchor: "end", style: "font-size: 0.7em" });
				if (graph.maxy > (graph.data.raw[keys[0]] + 10)) steptext.textContent = graph.data.raw[keys[0]];
				else steptext.textContent = graph.data.yprecision ? graph.miny.toFixed(graph.data.yprecision) : Math.floor(graph.miny);				
				graph.scalable.appendChild(steptext);
			}
			// Render Y grid lines
			for (i = stepdeltay + graph.miny; i <= graph.maxy; i += stepdeltay) {
				runningy -= graph.gheight / numstepsy;
				if (!graph.data.ynonumbers && (!graph.data.ynumbermod || (i % graph.data.ynumbermod == 0))) {
					steptext = svg.makeEl("text", { x: graph.ystartx, y: runningy + (svg.em * 0.5), fill: theme.textcolor, text_anchor: "end" });
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
		
		graph.label();
		graph.scale();
		graph.g.appendChild(graph.bgrid);
		if (gmaskfunc) {
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
		
		/*rhbfx.transition = function(time, started, duration) {
			return -(Math.cos(Math.PI * ((time - newfx.started) / newfx.duration)) - 1) / 2;
		}*/
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
		
		graph.getYPixel = function(yvalue) {
			return ((1 - ((yvalue - graph.miny) / (graph.maxy - graph.miny))) * graph.gheight) + graph.data.pady;
		}
		
		graph.plotValue = function(xvalue, yvalue) {
			x = (((xvalue - graph.minx) / (graph.maxx - graph.minx)) * graph.gwidth);
			graph.data.raw[xvalue] = yvalue;
			graph.data.bars[xvalue] = svg.makeRect(x - (graph.barwidth / 2) - 0.5, graph.xendy, graph.barwidth - 0.5, 0, { "stroke": "#666666", "stroke-width": "1", "fill": "#FFFFFF" });
			graph.data.fx[xvalue] = fx.make(fx.RatingHistogramBar, [ graph.data.bars[xvalue], graph.gheight + graph.data.pady, 250 ]);
			graph.data.fx[xvalue].set(graph.gheight + graph.data.pady);
			graph.plot.appendChild(graph.data.bars[xvalue]);
		};
		
		graph.update(graph.data.raw, true);
	};

	return that;
}