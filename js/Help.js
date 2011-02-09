var Help = function() {
	var that = {};
	var alltopics = [];
	var topics = {};
	var tuts = {};
	var steps = {};
	var alltopicsshown = 0;
	var showing;
	var ctutstep = 0;
	var ctutshowing = false;
	var ctut = false;
	var highlighted = [];
	var showingstepname = false;		// named differently because ctutstep is actually 1 /ahead/ of what's showing.
	
	/*	Steps and topics have the following properties:
		h: header language key (can be HTML)
		p: paragraph language key (optional) (can be HTML)
		pf: paragraph draw function (optional)
		pointel: array of elements to point at
		tutorial: trigger a tutorial (topic only)
		skipf: function to check whether the function should be skipped (step only)
		modx: modify x location by pixels
		mody
		width
		height		
		
		Tutorials are arrays of step names.
		*/
		
	that.addTopic = function(topic, data) {
		alltopics.push(topic);
		topics[topic] = data;
	};
	
	that.addStep = function(name, func) {
		steps[name] = func;
	};
	
	that.addTutorial = function(name, stepsequence) {
		tuts[name] = stepsequence;
	};
	
	that.addToTutorial = function(name, stepsequence) {
		if (!tuts[name]) return;
		tuts[name] = tuts[name].concat(stepsequence);
	};
	
	that.changeStepPointEl = function(name, pointel) {
		if (steps[name]) {
			steps[name].pointel = pointel;
			if (showingstepname == name) {
				ctutshowing.pointel = pointel;
				that.removeHighlights();
				that.drawHighlights(ctutshowing);
			}
		}
	};
	
	that.changeTopicPointEl = function(name, pointel) {
		if (topics[name]) {
			topics[name].pointel = pointel;
			if (alltopicsshown == 2) that.removeHighlights();
		}
	};
	
	that.showAllTopics = function() {
		if (alltopicsshown == 2) {
			that.hideAllTopics();
			return;
		}
		if (ctutshowing) {
			that.endTutorial();
		}
		alltopicsshown = 2;
		showing = [];
		var i;
		for (i = 0; i < alltopics.length; i++) {
			if (alltopics[i].skipf) {
				if (!alltopics[i].skipf()) {
					showing[i] = that.makeHelpDiv(topics[alltopics[i]]);
				}
			}
			else {
				showing[i] = that.makeHelpDiv(topics[alltopics[i]]);
			}
		}
		var x = window.innerWidth - svg.em;
		var y = window.innerHeight - (svg.em * 16);
		for (i = 0; i < alltopics.length; i++) {
			if (!topics[alltopics[i]].pointel) {
				x -= (showing[i].offsetWidth + (svg.em * 2));
				showing[i].fxY.set(y);
				showing[i].fxX.start(x);
			}
		}
	};
	
	that.hideAllTopics = function(exception) {
		that.endTutorial();
		that.removeHighlights();
		alltopicsshown = 1;
		for (var i in showing) {
			if (exception && alltopics[i] && (alltopics[i] == exception)) continue;
			showing[i].fxOpacity.start(0);
		}
		
	};
	
	that.startTutorial = function(tutname) {
		if (!tuts[tutname]) return;
		that.hideAllTopics();
		ctutshowing = that.makeHelpDiv(steps[tuts[tutname][0]], tutname);
		ctutstep = 1;
		ctut = tutname;
	};
	
	that.continueTutorial = function(tut, div) {
		if (alltopicsshown == 2) that.hideAllTopics(tut);
		var doo = false;
		while (true) {
			if (tuts[tut].length <= ctutstep) {
				that.endTutorial();
				return;
			}
			if (steps[tuts[tut][ctutstep]]) {
				that.removeHighlights();
				ctut = tut;
				var nx = false;
				if (steps[tuts[tut][ctutstep]].skipf) nx = steps[tuts[tut][ctutstep]].skipf();
				if (!nx) {
					ctutshowing = div;
					var laststep = false;
					if (ctutstep == (tuts[tut].length  - 1)) laststep = true;
					that.changeHelpDiv(steps[tuts[tut][ctutstep]], div, laststep);
					showingstepname = tuts[tut][ctutstep];
					ctutstep++;
					return;
				}
			}
			ctutstep++;
		}		
	};
	
	that.continueTutorialIfRunning = function(runningstep) {
		if ((ctutstep > 0) && (runningstep == tuts[ctut][ctutstep - 1])) {
			that.continueTutorial(ctut, ctutshowing);
		}
	};
	
	that.endTutorial = function() {
		if (!ctutshowing) return;
		ctutshowing.fxOpacity.start(0);
		ctutstep = 0;
		ctutshowing = false;
		ctut = false;
		that.removeHighlights();
	};
	
	that.clickXButton = function() {
		if (ctutshowing) {
			that.endTutorial();
		}
		else {
			that.hideAllTopics();
		}
	};
	
	that.makeHelpDiv = function(data, tutorial) {
		var container = createEl("div", { "class": "help_container" });
		
		container.x = createEl("span", { "class": "help_x", "textContent": "X" });
		container.x.addEventListener("click", that.clickXButton, true);
		container.appendChild(container.x);
		
		container.div = createEl("div", { "class": "help" });
		container.appendChild(container.div);

		container.fxX = fx.make(fx.CSSNumeric, [ container, 500, "left", "px" ]);
		container.fxX.set(-1000);
		container.fxY = fx.make(fx.CSSNumeric, [ container, 500, "top", "px" ]);
		container.fxY.set(-1000);
		container.fxWidth = fx.make(fx.CSSNumeric, [ container, 500, "width", "px" ]);
		container.fxHeight = fx.make(fx.CSSNumeric, [ container.div, 500, "height", "px" ]);
		container.fxOpacity = fx.make(fx.CSSNumeric, [ container, 500, "opacity", "" ]);
		container.fxOpacity.set(1);
		container.fxOpacity.onComplete = function() { document.getElementById("body").removeChild(container); };
		
		if (data.tutorial) {
			container.div.addEventListener("click", function() { that.continueTutorial(data.tutorial, container); }, true);
			container.div.style.cursor = "pointer";	
			
			container.next = createEl("div", { "class": "help_next" });
			container.next.addEventListener("click", function() { that.continueTutorial(data.tutorial, container); }, true);
			container.next.style.cursor = "pointer";
			container.appendChild(container.next);
		}
		else if (tutorial) {
			container.div.addEventListener("click", function() { that.continueTutorial(tutorial, container); }, true);
			container.div.style.cursor = "pointer";	
			
			container.next = createEl("div", { "class": "help_next" });
			container.next.addEventListener("click", function() { that.continueTutorial(tutorial, container); }, true);
			container.next.style.cursor = "pointer";
			container.appendChild(container.next);
		}
		
		document.getElementById("body").appendChild(container);
		container.fxWidth.set(container.offsetWidth);
		container.fxHeight.set(container.div.offsetHeight);
		that.changeHelpDiv(data, container);
		
		return container;
	};
	
	that.changeHelpDiv = function(data, container, laststep) {
		if (container.h) container.div.removeChild(container.h);
		container.h = createEl("div", { "class": "help_header" });
		_l(data.h, {}, container.h);
		container.div.appendChild(container.h);

		if (container.p) container.div.removeChild(container.p);
		if (data.p) {
			container.p = createEl("div", { "class": "help_paragraph" });
			_l(data.p, {}, container.p);
			container.div.appendChild(container.p);
		}
		else if (data.pf) {
			container.p = data.pf(container.div);
		}
		
		if (container.next) {
			if (alltopicsshown == 2) {
				_l("helpstart", {}, container.next);
			}
			else if (laststep) {
				_l("helplast", {}, container.next);
			}
			else {
				_l("helpnext", {}, container.next);
			}
		}
		
		var width = data.width ? data.width : svg.em * 28;
		var height = data.height ? data.height : svg.em * 12;
		container.fxWidth.start(width);
		container.fxHeight.start(height);

		var finalx, finaly;
		if (data.pointel && data.pointel[0]) {
			var pel = that.getElPosition(data.pointel[0]);
			if (pel.x < (window.innerWidth / 2)) finalx = pel.x + that.getElWidth(data.pointel[0]) + (svg.em * 3);
			else finalx = pel.x - (width + (svg.em * 3));
			finaly = pel.y;
		}
		else {
			finalx = Math.round((window.innerWidth / 2) - (height / 2));
			finaly = Math.round((window.innerHeight / 2) - (width / 2));
		}
		if (data.modx) finalx += data.modx;
		if (data.mody) finaly += data.mody;
		if (finalx < 5) finalx = 5;
		if (finaly < 5) finaly = 5;
		
		if (alltopicsshown == 2) {
			var setx, sety;
			if (!data.pointel) {
				setx = window.innerWidth;
				sety = window.innerHeight;
			}
			else {
				var pel = that.getElPosition(data.pointel[0]);
				if (pel.x < (window.innerWidth / 2)) setx = -width;
				else setx = window.innerWidth;
				if (pel.y < (window.innerHeight / 2)) sety = -height;
				else sety = window.innerHeight;
			}
			container.fxX.set(setx);
			container.fxY.set(sety);
		}
		
		if ((alltopicsshown != 2) || (data.pointel)) {
			container.fxX.start(finalx);
			container.fxY.start(finaly);
		}
		
		container.finalwidth = width;
		container.finalheight = height;
		container.finalx = finalx;
		container.finaly = finaly;
		
		if (data.pointel) container.pointel = data.pointel;
		else container.pointel = false;
		that.drawHighlights(container);
	};
	
	that.getElPosition = function(el) {
		var x = 0;
		var y = 0;
		if (!el) return { "x": x, "y": y };
		if (svg.capable && svg.isElSVG(el)) {
			var m = el.getScreenCTM();
			x = Math.round(m.e);
			y = Math.round(m.f);
			if (el.nodeName != "path") {
				x += parseInt(el.getAttribute("x"));
				y += parseInt(el.getAttribute("y"));
			}
			if (el.nodeName == "text") y -= svg.em;
			else if (el.nodeName == "path") y += 12; // cheap hack for ratings
		}
		else {
			var cel = el;
			do {
				x += cel.offsetLeft;
				y += cel.offsetTop;
				if (cel.offsetParent && cel.offsetParent.scrollLeft) x -= cel.offsetParent.scrollLeft;
				if (cel.offsetParent && cel.offsetParent.scrollTop) y -= cel.offsetParent.scrollTop;
			} while (cel = cel.offsetParent);
		}
		return { "x": x, "y": y };
	};
	
	that.getElWidth = function(el, overridetext) {
		if (svg.isElSVG(el)) {
			if (el.nodeName == "path") return 12;		// cheap hack for ratings, really the only place we use a path in the help system
			if (el.getAttribute("width") && !overridetext) return parseInt(el.getAttribute("width"));
			if (el.nodeName == "text") {
				var size = el.style.fontSize ? el.style.fontSize : "1em";
				var weight = el.style.fontWeight ? el.style.fontWeight : "normal";
				return measureText(el.textContent, "font-size: " + size + "; font-weight: " + weight);
			}
			return 0;
		}
		else return el.offsetWidth;
	};
	
	that.getElHeight = function(el, overridetext) {
		if (svg.isElSVG(el)) {
			//if (el.nodeName == "path") return 12;
			if (el.getAttribute("height") && !overridetext) return parseInt(el.getAttribute("height"));
			if (el.nodeName == "text") return svg.em * 1.2;
			return 0;
		}
		else return el.offsetHeight;
	};
	
	that.drawHighlights = function(container) {
		for (var i = 0; i < container.pointel.length; i++) {
			var obj = {};
			obj.el = container.pointel[i];
			if (svg.isElSVG(obj.el)) {
				obj.stroke = obj.el.getAttribute("stroke");
				obj.strokewidth = obj.el.getAttribute("stroke-width");
				obj.el.setAttribute("stroke", theme.helplinecolor);
				if (obj.el.nodeName == "text") obj.el.setAttribute("stroke-width", 1);
				else obj.el.setAttribute("stroke-width", 2);
			}
			else {
				if ((obj.el.children.length == 0) && (obj.el.textContent > "")) {
					obj.color = that.getStyle(obj.el, "color");
					obj.fontweight = that.getStyle(obj.el, "font-weight");
					obj.el.style.color = theme.helptextcolor;
					obj.el.style.fontWeight = "bold";
				}
				else {
					obj.border = that.getStyle(obj.el, "border");
					obj.el.style.border = "solid 2px " + theme.helplinecolor;
				}
			}
			highlighted.push(obj);
		}
	};
	
	that.removeHighlights = function() {
		for (var i = 0; i < highlighted.length; i++) {
			if (svg.isElSVG(highlighted[i].el)) {
				if (highlighted[i].stroke) highlighted[i].el.setAttribute("stroke", highlighted[i].stroke);
				else highlighted[i].el.removeAttribute("stroke");
				if (highlighted[i].strokewidth) highlighted[i].el.setAttribute("stroke-width", highlighted[i].strokewidth);
				else highlighted[i].el.removeAttribute("strokewidth");
			}
			else {
				if (highlighted[i].border) highlighted[i].el.style.border = highlighted[i].border;
				else highlighted[i].el.style.border = "";
				if (highlighted[i].color) highlighted[i].el.style.color = highlighted[i].color;
				else highlighted[i].el.style.color = "inherit";
				if (highlighted[i].fontweight) highlighted[i].el.style.fontWeight = highlighted[i].fontweight;
				else highlighted[i].el.style.fontWeight = "normal";
			}
		}
		highlighted = [];
	};
	
	/* courtesy http://www.quirksmode.org/dom/getstyles.html */
	that.getStyle = function(el, styleProp) {
		if (el.currentStyle)
			var y = el.currentStyle[styleProp];
		else if (window.getComputedStyle)
			var y = document.defaultView.getComputedStyle(el,null).getPropertyValue(styleProp);
		return y;
	};
	
	return that;
};