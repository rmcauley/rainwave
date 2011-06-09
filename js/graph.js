var graph = function() {
	if (!svg.capable) return false;
	var that = {};
	
	var svgdefs = svg.make( { style: "position: absolute;", "width": 0, "height": 0 } );
	var defs = svg.makeEl("defs");
	theme.graphDefs(svgdefs, defs);
	svgdefs.appendChild(defs);
	document.getElementById("body").appendChild(svgdefs);
	
	// graphs should be an array of objects that consist of:
	//		data
	//		options
	//		graphfunc
	
	that.makeSVG = function(width, height, graphs) {
		var newgr = that.make(0, 0, width, height, graphs);
		newgr.svg = svg.make({ width: width, height: height });
		newgr.svg.appendChild(newgr.g);
		return newgr;
	};
	
	that.make = function(x, y, width, height, graphs) {
		var newgr = {};
		newgr.graphs = graphs;

		newgr.g = svg.makeEl("g");
		if (x || y) newgr.g.setAttribute("transform", "translate(" + x + ", " + y + ")");
		
		var i;
		
		// Variables for scaling the graph, that apply once across the entire graph.
		// Scaling is done only according to the first data set.
		
		newgr.xaxis_width = 0;
		newgr.xaxis_padpx = 0;
		newgr.xaxis_height = 0;
		newgr.xaxis_steps = graphs[0].options.xaxis_steps ? graphs[0].options.xaxis_steps : 10;
		newgr.xgrid_perstep = graphs[0].options.xgrid_perstep ? graphs[0].options.xgrid_perstep : false; 
		
		newgr.yaxis_height = 0;
		newgr.yaxis_padpx = 0;
		newgr.yaxis_width = 0;
		newgr.yaxis_steps = graphs[0].options.yaxis_steps ? graphs[0].options.yaxis_steps : 5;
		newgr.ygrid_perstep = graphs[0].options.ygrid_perstep ? graphs[0].options.ygrid_perstep : false;
		
		// Set-up scaling and variables for each graph
		
		for (i = 0; i < newgr.graphs.length; i++) {
			newgr.graphs[i].graphindex = parseInt("" + i);		// the horror
			that.graphSkeleton(newgr, newgr.graphs[i]);
			newgr.graphs[i].graphfunc(newgr, newgr.graphs[i]);
		}
		// we only need to scale the first graph to do work, graph.update() will handle scaling for the other graphs
		newgr.graphs[0].scale();

		// The following code is only calculated once based on options, so does not need to be part of per-update scaling
		
		if (!graphs[0].options.xaxis_padpx) {
			if (graphs[0].xaxis_nonumbers) newgr.xaxis_padpx = 0;
			else newgr.xaxis_padpx = UISCALE;
		}
		else {
			newgr.xaxis_padpx = graphs[0].options.xaxis_padpx;
		}
		if (!graphs[0].options.yaxis_padpx) {
			if (graphs[0].options.yaxis_ynonumbers) newgr.yaxis_padpx = 0;
			else newgr.yaxis_padpx = UISCALE;
		}
		else {
			newgr.yaxis_padpx = graphs[0].options.yaxis_padpx;
		}
		
		if (!graphs[0].options.xaxis_nonumbers) newgr.xaxis_height = Math.floor(UISCALE * 1.5);
		else newgr.xaxis_height = 1;
		
		if (!graphs[0].yaxis_nonumbers) newgr.yaxis_width = measureNumber(Math.floor(newgr.graphs[0].yaxis_max));
		else newgr.yaxis_width = 1;
		
		newgr.xaxis_width = width - newgr.yaxis_width - newgr.xaxis_padpx;
		newgr.yaxis_height = height - newgr.xaxis_height - newgr.yaxis_padpx;
		
		// Following code only gets drawn once on graph init (borders, etc)

		var grid = svg.makeEl("g");
		
		if (!graphs[0].options.xgrid_modulus) graphs[0].options.xgrid_modulus = false;
		if (!graphs[0].options.xaxis_steps) graphs[0].options.xaxis_steps = (newgr.graphs[0].xaxis_max - newgr.graphs[0].xaxis_min) / newgr.graphs[0].xaxis_steps;
		if (!graphs[0].options.ygrid_modulus) graphs[0].options.ygrid_modulus = false;
		if (!graphs[0].options.yaxis_steps) graphs[0].options.yaxis_steps = (newgr.graphs[0].yaxis_max - newgr.graphs[0].yaxis_min) / newgr.graphs[0].yaxis_steps;
		
		// Render X grid lines
		var stepline;
		if (!graphs[0].options.xgrid_disable) {
			var xgrid_start = graphs[0].options.xgrid_start ? graphs[0].options.xgrid_start : newgr.xgrid_perstep + newgr.graphs[0].xaxis_min;
			for (i = xgrid_start; i <= newgr.graphs[0].xaxis_max; i += newgr.xgrid_perstep) {
				x = newgr.graphs[0].getXPixel(i) + newgr.yaxis_width;
				stepline = svg.makeLine(x, newgr.yaxis_height + newgr.yaxis_padpx, x, 0, { "stroke": theme.vdarktext, "stroke_width": 1 });
				grid.appendChild(stepline);
			}
		}
		
		// Render Y grid lines
		if (!graphs[0].options.ygrid_disable) {
			var ygrid_start = graphs[0].options.ygrid_start ? graphs[0].options.ygrid_start : newgr.ygrid_perstep + newgr.graphs[0].yaxis_min;
			for (i = ygrid_start; i <= newgr.graphs[0].yaxis_max; i += newgr.ygrid_perstep) {
				y = newgr.graphs[0].getYPixel(i);
				stepline = svg.makeLine(newgr.yaxis_width, y, width, y, { stroke: theme.vdarktext, stroke_width: 1 });
				grid.appendChild(stepline);
			}
		}
		
		var border = svg.makeEl("g");
		var bordery = svg.makeLine(newgr.yaxis_width, 0, newgr.yaxis_width, newgr.yaxis_height + newgr.yaxis_padpx, { shape_rendering: "crispEdges", stroke: theme.textcolor, stroke_width: 1 } );
		var borderx = svg.makeLine(newgr.yaxis_width, newgr.yaxis_height + newgr.yaxis_padpx, width, newgr.yaxis_height + newgr.yaxis_padpx, { shape_rendering: "crispEdges", stroke: theme.textcolor, stroke_width: 1 } );
		border.appendChild(bordery);
		border.appendChild(borderx);
		
		// if (subgraph.data.xlabel) {
			// var xlabelx = ((subgraph.width - (UISCALE * 2)) / 2) - (measureText(subgraph.data.xlabel) / 2) + (UISCALE * 2);
			// var xlabel = svg.makeEl("text", { x: xlabelx, y: subgraph.height - (UISCALE * .3), fill: theme.textcolor });
			// xlabel.textContent = subgraph.data.xlabel;
			// subgraph.g.appendChild(xlabel);
			// subgraph.xendy -= UISCALE;
		// }
		
		// if (subgraph.data.ylabel) {
			// var ylabely = subgraph.height - UISCALE - measureText(subgraph.data.ylabel);
			// var ylabel = svg.makeEl("text", { x: 0, y: ylabely + UISCALE, fill: theme.textcolor, transform: "rotate(-90, 0, " + ylabely + ")" });
			// ylabel.textContent = subgraph.data.ylabel;
			// subgraph.g.appendChild(ylabel);
			// subgraph.ystartx += UISCALE + (UISCALE * .3);
		// }
		
		newgr.g.appendChild(grid);
		
		// TODO: Make this fade in/out and the graph re-scalable
		newgr.g.appendChild(newgr.graphs[0].getScaledGroup());
		
		for (i = 0; i < newgr.graphs.length; i++) {
			newgr.graphs[i].update(newgr.graphs[i].data, true);
			newgr.g.appendChild(newgr.graphs[i].plot);
		}
		
		newgr.g.appendChild(border);
		
		return newgr;
	};
	
	//**************************************************************************************************
		
	that.graphSkeleton = function(parent, graph) {
		graph.xaxis_perstep = 0;
		graph.yaxis_perstep = 0;
		graph.plot = svg.makeEl("g");
		graph.xaxis_max = false;
		graph.xaxis_min = false;
		graph.yaxis_max = false;
		graph.yaxis_min = false;
		
		graph.plot = svg.makeEl("g");
		
		var translateset = false;
	
		graph.scale = function() {
			if (!translateset && parent.yaxis_width) {
				graph.plot.setAttribute("transform", "translate(" + parent.yaxis_width + ",0)");
				translateset = true;
			}
			
			var i, j;
			
			graph.xaxis_points = [];
			var p_miny = 1000000000;		// potential min y
			var p_maxy = 0;					// potential max y
			for (i in graph.data) {
				graph.xaxis_points.push(i);
				if (graph.data[i] < p_miny) p_miny = graph.data[i];
				if (graph.data[i] > p_maxy) p_maxy = graph.data[i];
			}
			graph.xaxis_points.sort();

			if (graph.options.xaxis_max) graph.xaxis_max = graph.options.xaxis_max;
			else graph.xaxis_max = Math.ceil(graph.xaxis_points[graph.xaxis_points.length - 1] / 10.0) * 10;
			if (graph.options.xaxis_min) graph.xaxis_min = graph.options.xaxis_min;
			else graph.xaxis_min = graph.xaxis_points[0] - ((graph.xaxis_points[graph.xaxis_points.length - 1] - graph.xaxis_points[0]) * 0.05);
			if (graph.options.yaxis_min) graph.yaxis_min = graph.options.yaxis_min;
			else graph.yaxis_max = p_maxy;
			if (graph.options.yaxis_max) graph.yaxis_max = graph.options.yaxis_max;
			else graph.yaxis_min = Math.floor(p_miny - ((p_maxy - p_miny) * 0.1));

			if (graph.options.yaxis_minrange && ((graph.yaxis_max - graph.yaxis_min) < graph.options.yaxis_minrange)) {
				graph.yaxis_min = graph.yaxis_max - graph.options.yaxis_minrange;
				if (graph.yaxis_min < 0) graph.yaxis_min += Math.abs(graph.yaxis_min);
			}
			
			if (graph.xaxis_min < 0) graph.xaxis_min = 0;
			if (graph.yaxis_min < 0) graph.yaxis_min = 0;
			
			graph.xaxis_perstep = (graph.xaxis_max - graph.xaxis_min) / parent.xaxis_steps;
			if (!graph.options.xgrid_perstep) parent.xgrid_perstep = graph.xaxis_perstep;
			graph.yaxis_perstep = (graph.yaxis_max - graph.yaxis_min) / parent.yaxis_steps;
			if (!graph.options.ygrid_perstep) parent.ygrid_perstep = graph.yaxis_perstep;
		};
		
		graph.getScaledGroup = function() {
			var scaleg = svg.makeEl("g", { "transform": "translate(0, " + parent.yaxis_padpx + ")"} );
			
			var steptext;
			var usedxmin = false;
			// Render minimum X value
			if (((graph.xaxis_min !== 0) || (graph.yaxis_min !== 0)) && !graph.options.xaxis_nonumbers && !graph.options.xaxis_nomin) {
				usedxmin = true;
				steptext = svg.makeEl("text", { x: parent.yaxis_width + 2, y: parent.yaxis_height + UISCALE + 2, fill: theme.vdarktext, text_anchor: "middle", style: "font-size: 0.7em" });
				steptext.textContent = (graph.options.axis_precision) ? graph.xaxis_min.toFixed(graph.options.xaxis_precision) : Math.floor(graph.xaxis_min);
				scaleg.appendChild(steptext);
			}
			
			// Render X numbers
			if (!graph.options.xaxis_nonumbers) {
				for (i = parent.xgrid_perstep + graph.xaxis_min; i <= graph.xaxis_max; i += parent.xgrid_perstep) {
					x = graph.getXPixel(i) + parent.yaxis_width;
					if (!graph.options.xgrid_modulus || (i % graph.options.xgrid_modulus == 0)) {
						steptext = svg.makeEl("text", { "x": x, "y": parent.yaxis_height + UISCALE * 1.2, "fill": theme.textcolor, "text_anchor": "middle" });
						steptext.textContent = (graph.options.xaxis_precision) ? i.toFixed(graph.options.xaxis_precision) : Math.floor(i);
						scaleg.appendChild(steptext);
					}
				}
			}
			
			// Render Y minimum text
			if (((graph.xaxis_min !== 0) || (graph.yaxis_min !== 0)) && !graph.options.yaxis_nonumbers && !graph.options.yaxis_nomin) {
				var zerotexty = parent.yaxis_height;
				if (!usedxmin) zerotexty -= (UISCALE * 0.7);
				steptext = svg.makeEl("text", { "x": parent.yaxis_width - 2, "y": zerotexty, "fill": theme.vdarktext, "text_anchor": "end", "style": "font-size: 0.7em" });
				if (graph.options.yaxis_reverse) {
					steptext.textContent = graph.options.yaxis_precision ? graph.yaxis_max.toFixed(graph.options.yaxis_precision) : Math.floor(graph.yaxis_max);
				}
				else {
					steptext.textContent = graph.options.yaxis_precision ? graph.yaxis_min.toFixed(graph.options.yaxis_precision) : Math.floor(graph.yaxis_min);
				}
				scaleg.appendChild(steptext);
			}

			if (!graph.options.yaxis_nonumbers) {
				var ydisp;
				// This loop is a little trickier because of the possibility of reversing
				i = graph.options.yaxis_reverse ? graph.yaxis_max - graph.yaxis_perstep : graph.yaxis_perstep + graph.yaxis_min;
				var y = parent.yaxis_height;
				while (true) {
					y -= parent.yaxis_height / parent.yaxis_steps;
					if (!graph.options.ygrid_modulus || (i % graph.options.ygrid_modulus == 0)) {
						steptext = svg.makeEl("text", { "x": parent.yaxis_width, "y": y + (UISCALE * 0.5), "fill": theme.textcolor, "text_anchor": "end" });
						ydisp = i;
						if ((i == graph.yaxis_max) || (graph.yaxis_max < 50)) ydisp = (i / 10) * 10;
						steptext.textContent = graph.options.yaxis_precision ? ydisp.toFixed(graph.options.yprecision) : Math.floor(ydisp);
						scaleg.appendChild(steptext);
					}
					if (graph.options.yaxis_reverse) {
						if (i <= graph.yaxis_min) break;
						i -= graph.yaxis_perstep;
					}
					else {
						if (i >= graph.yaxis_max) break;
						i += graph.yaxis_perstep;
					}
				}
			}
			
			return scaleg;
		};
		
		graph.getXPixel = function(xvalue) {
			return (((xvalue - graph.xaxis_min) / (graph.xaxis_max - graph.xaxis_min)) * parent.xaxis_width);
		};
		
		if (graph.options.yaxis_reverse) {
			graph.getYPixel = function(yvalue) {
				return (((((yvalue - graph.yaxis_min) / (graph.yaxis_max - graph.yaxis_min))) * parent.yaxis_height) + parent.yaxis_padpx);
			};
		}
		else {
			graph.getYPixel = function(yvalue) {
				return (((1 - ((yvalue - graph.yaxis_min) / (graph.yaxis_max - graph.yaxis_min))) * parent.yaxis_height) + parent.yaxis_padpx);
			};
		}

		graph.update = function(newdata, init) {
			var oldpoints = [];
			if (!init) oldpoints = graph.xaxis_points;
			
			graph.data = newdata;
			graph.scale();

			if (!init) {
				for (var x in oldpoints) {
					if (!(x in graph.xaxis_points)) graph.removePoint(x);
				}
			}

			var lastx = false;
			var lasty = false;
			for (x = 0; x < graph.xaxis_points.length; x++) {
				if (!(x in oldpoints) || (init)) {
					graph.addPoint(graph.xaxis_points[x], newdata[graph.xaxis_points[x]], lastx, lasty);
				}
				lastx = graph.xaxis_points[x];
				lasty = newdata[graph.xaxis_points[x]];
			}

			if (fx.enabled) setTimeout(graph.animate, 100);
			else graph.animate();
		};
		
		return graph;
	};
	
	//**************************************************************************************************

	fx.extend("BarGraphBar", function(object, yaxis_height) {
		var rhbfx = {};

		rhbfx.update = function(now) {
			object.setAttribute("y", now);
			if ((yaxis_height - now - 1) > 0) object.setAttribute("height", yaxis_height - now - 1);
			else object.setAttribute("height", 0);
		};

		return rhbfx;
	});
	
	that.Bar = function(parent, graph) {
		var gfx = [];
		var bars = [];
		
		for (var i = 0; i < graph.data.length; i++) {
			gfx[i] = {};
			bars[i] = {};
		}
		
		graph.removePoint = function(x) {
			graph.plot.removeChild(bars[x]);
			delete(bars[x]);
			delete(gfx[x]);
		};
		
		graph.animate = function() {
			for (var x in graph.data) {
				gfx[x].start(graph.getYPixel(graph.data[x]));
			}
		};
		
		graph.addPoint = function(x, y) {
			var x_px = graph.getXPixel(x);
			var y_px = graph.getYPixel(y);
			var barwidth = (parent.xaxis_width / parent.xaxis_steps) - 2;
			bars[x] = svg.makeRect(x_px - (barwidth / 2) - 1, parent.yaxis_height, barwidth - 0.5, 0);
			if (graph.options.fill) {
				bars[x].setAttribute("fill", graph.options.fill(graph.graphindex, x_px / parent.xaxis_width, y_px / parent.yaxis_width));
			}
			
			gfx[x] = fx.make(fx.BarGraphBar, bars[x], 250, parent.yaxis_height + parent.yaxis_padpx);
			gfx[x].set(parent.yaxis_height + parent.yaxis_padpx);
			graph.plot.appendChild(bars[x]);
		};
	};
	
	//**************************************************************************************************

	fx.extend("LineGraphLine", function(line) {
		var lfx = {};
		
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
	
	that.Line = function(parent, graph) {
		var fx_l = [];
		var fx_py = [];
		var fx_px = [];
		var lines = [];
		var points = [];
		
		graph.removePoint = function(x) {
			graph.plot.removeChild(lines[x]);
			graph.plot.removeChild(points[x]);
			delete(lines[x]);
			delete(points[x]);
			delete(fx_l[x]);
			delete(fx_py[x]);
			delete(fx_px[x]);
		};
		
		graph.animate = function() {
			var lastx_px = false;
			var lasty_px = false;
			var i, x, y, x_px, y_px;
			for (i = 0; i < graph.xaxis_points.length; i++) {
				x = graph.xaxis_points[i];
				y = graph.data[x];
				x_px = graph.getXPixel(x);
				y_px = graph.getYPixel(y);
				
				if (lastx_px && lasty_px && fx_l[x]) {
					fx_l[x].setTo(lastx_px, lasty_px, x_px, y_px);
					fx_l[x].set(0);
					fx_l[x].start(1);
				}
				fx_px[x].start(x_px - 3);
				fx_py[x].start(y_px - 3);
				lastx_px = x_px;
				lasty_px = y_px;
			}
		};

		graph.addPoint = function(x, y, lastx, lasty) {
			var x_px = graph.getXPixel(x);
			var y_px = graph.getYPixel(y);
			
			var fill = "#FFF";
			if (graph.options.fill) {
				fill = graph.options.fill(graph.graphindex, x_px / parent.xaxis_width, y_px / parent.yaxis_height);
			}
			
			points[x] = svg.makeRect(x_px - 3, parent.yaxis_height + parent.yaxis_padpx - 3, 6, 6, { "fill": fill });
			fx_px[x] = fx.make(fx.SVGAttrib, points[x], 250, "x");
			fx_px[x].set(x_px - 3);
			fx_py[x] = fx.make(fx.SVGAttrib, points[x], 250, "y");
			fx_py[x].set(parent.yaxis_height + parent.yaxis_padpx - 6);
			
			if (lastx && lasty) {
				var lx_px = graph.getXPixel(lastx);
				var stroke = "#BBB";
				if (graph.options.stroke) {
					stroke = graph.options.stroke(graph.graphindex, x_px / parent.xaxis_width, y_px / parent.yaxis_height);
				}
				lines[x] = svg.makeLine(lx_px, parent.yaxis_height + parent.yaxis_padpx, x_px, parent.yaxis_height + parent.yaxis_padpx, { "stroke": stroke, "stroke-width": 2 });
				graph.plot.appendChild(lines[x]);
				fx_l[x] = fx.make(fx.LineGraphLine, lines[x], 250);
				fx_l[x].setFrom(lx_px, parent.yaxis_height + parent.yaxis_padpx, lx_px, parent.yaxis_height + parent.yaxis_padpx);
			}
			
			graph.plot.appendChild(points[x]);
		};
	};

	return that;
}();