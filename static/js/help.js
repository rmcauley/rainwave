var help = function() {
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
			if (showingstepname === name) {
				ctutshowing.pointel = pointel;
			}
		}
	};
	
	that.changeTopicPointEl = function(name, pointel) {
		if (topics[name]) {
			topics[name].pointel = pointel;
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
		var x = window.innerWidth - UISCALE;
		var y = window.innerHeight - (UISCALE * 16);
		for (i = 0; i < alltopics.length; i++) {
			if (!topics[alltopics[i]].pointel) {
				x -= (showing[i].offsetWidth + (UISCALE * 2));
				showing[i].fxY.set(y);
				showing[i].fxX.start(x);
			}
		}
	};
	
	that.hideAllTopics = function(exception) {
		that.endTutorial();
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
	
	that.getCurrentTutorial = function() {
		return ctut;
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
				//that.removeHighlights();
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
		showingstepname = false;
		ctutshowing.fxOpacity.start(0);
		ctutstep = 0;
		ctutshowing = false;
		ctut = false;
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

		container.fxX = fx.make(fx.CSSTranslateX, container, 500);
		container.fxX.set(-1000);
		container.fxY = fx.make(fx.CSSTranslateY, container, 500);
		container.fxY.set(-1000);
		container.fxWidth = fx.make(fx.CSSNumeric, container, 500, "width", "px");
		container.fxHeight = fx.make(fx.CSSNumeric, container.div, 500, "height", "px");
		container.fxOpacity = fx.make(fx.CSSNumeric, container, 500, "opacity", "");
		container.fxOpacity.set(1);
		container.fxOpacity.onComplete = function() { document.getElementById("body").removeChild(container); };
		
		var laststep = false;
		if (data.tutorial) tutorial = data.tutorial;
		if (tutorial) {
			container.div.addEventListener("click", function() { that.continueTutorial(tutorial, container); }, true);
			container.div.style.cursor = "pointer";	
			
			container.next = createEl("div", { "class": "help_next" });
			container.next.addEventListener("click", function() { that.continueTutorial(tutorial, container); }, true);
			container.next.style.cursor = "pointer";
			container.appendChild(container.next);
			
			if (tuts[tutorial].length == 1) laststep = true;
		}
		
		document.getElementById("body").appendChild(container);
		container.fxWidth.set(container.offsetWidth);
		container.fxHeight.set(container.div.offsetHeight);
		that.changeHelpDiv(data, container, laststep);
		
		return container;
	};
	
	that.changeHelpDiv = function(data, container, laststep) {
		if (container.h) container.div.removeChild(container.h);
		container.h = createEl("div", { "class": "help_header" });
		_l(data.h, null, container.h);
		container.div.appendChild(container.h);

		if (container.p) container.div.removeChild(container.p);
		if (data.p) {
			container.p = createEl("div", { "class": "help_paragraph" });
			_l(data.p, null, container.p);
			container.div.appendChild(container.p);
		}
		else if (data.pf) {
			container.p = data.pf(container.div);
		}
		
		if (container.next) {
			if (alltopicsshown == 2) {
				_l("helpstart", null, container.next);
			}
			else if (laststep) {
				_l("helplast", null, container.next);
			}
			else {
				_l("helpnext", null, container.next);
			}
		}
		
		var width = data.width ? data.width : UISCALE * 28;
		var height = data.height ? data.height : UISCALE * 12;
		container.fxWidth.start(width);
		container.fxHeight.start(height);
		
		if (container.arrow) {
			container.removeChild(container.arrow);
			container.arrow = false;
		}

		var finalx, finaly, pel, arrow, arrowx, arrowy;
		finalx = 0;
		finaly = 0;
		if (data.pointel && data.pointel[0]) {
			pel = that.getElPosition(data.pointel[0]);
			if (pel.y < 30) {
				finalx += pel.x - UISCALE;
				finaly += pel.y;
				arrow = "up";
				arrowy = 0;
				arrowx = pel.x - finalx + UISCALE;
			}
			else if (pel.x < (window.innerWidth * 0.75)) {
				finalx += pel.x + that.getElWidth(data.pointel[0]);
				finaly += pel.y - UISCALE;
				arrow = "left";
				arrowx = 0;
				arrowy = pel.y - finaly - (UISCALE / 2);
			}
			else {
				finalx += pel.x - width;
				finaly += pel.y - UISCALE;
				arrow = "right";
				arrowx = width;
				arrowy = pel.y - finaly - (UISCALE / 2);
			}
			container.arrow = createEl("div", { "class": "help_arrow_" + arrow, "style": "left: " + arrowx + "px; top: " + arrowy + "px;" });
			container.insertBefore(container.arrow, container.firstChild);
		}
		else {
			finalx += Math.round((window.innerWidth / 2) - (height / 2));
			finaly += Math.round((window.innerHeight / 2) - (width / 2));
		}
		if (finalx < 5) finalx = 5;
		if (finaly < 5) finaly = 5;
		if (data.modx) finalx += data.modx;
		if (data.mody) finaly += data.mody;
		
		if (alltopicsshown == 2) {
			var setx, sety;
			if (!data.pointel) {
				setx = window.innerWidth;
				sety = window.innerHeight;
			}
			else {
				if (!pel) pel = that.getElPosition(data.pointel[0]);
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
			if (el.nodeName == "text") y -= UISCALE;
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
			if (el.nodeName == "text") return UISCALE * 1.2;
			return 0;
		}
		else return el.offsetHeight;
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
}();

function drawAboutScreen(div) {
	var tbl = createEl("table", { "class": "about help_paragraph" });
	var html = "<tr><td style='width: 10em;'>" + _l("rainwave3version") + ":</td><td>" + _l("revision") + " " + BUILDNUM + "</td></tr>";
	html += "<tr><td>" + _l("creator") + ":</td><td>LiquidRain</td></tr>";
	html += "<tr><td>" + _l("staff") + ":</td><td>Ten19 and Metal-Ridley (game)<br />SOcean255 (covers)<br />Schneau and Natural-Chemical (chiptunes)<br />William and jfinalfunk (special projects)</td></tr>";
	html += "<tr><td>" + _l("relayadmins") + ":</td><td>Lyfe, Tanaric, Dracoirs</td></tr>";
	html += "<tr><td>" + _l("translators") + ":</td><td>Metal-Geo (NL), Metal-Ridley (FR), quarterlife (FI), Steppo (SE), DarkLink (DE), BreadMaker (ES), ocrfan (PT).</td></tr>";
	html += "<tr><td style='padding-top: 1em;'>" + _l("specialthanks") + ":</td><td style='padding-top: 1em;'>strwrsxprt, heschi, Brayniac, Salty, efiloN, Steppo, Vyzov.</td></tr>";
	html += "<tr><td style='padding-top: 1em;'>" + _l("poweredby") + ":</td><td style='padding-top: 1em;'>" + _l("customsoftware") + ", <a href='http://icecast.org' class='new_window' target='_blank' onclick='return false;'>Icecast</a>, <a href='http://savonet.sourceforge.net' target='_blank' class='new_window' onclick='return false;'>Liquidsoap</a></td></tr>";
	tbl.innerHTML = html;
	div.appendChild(tbl);
	var a1 = createEl("a", { "href": "/pages/tip_jar", "textContent": _l("donationinformation"), "class": "help_paragraph new_window", "style": "margin-top: 1em; display: block", "target": "_blank" });
	div.appendChild(a1);
	//var a2 = createEl("a", { "href": "/api", "textContent": _l("apiinformation"), "class": "help_paragraph", "style": "margin-top: 1em; display: block", "target": "_blank", "onclick": "return false;" });
	//a2.appendChild(createEl("img", { "src": "images/new_window_icon.png", "alt": "->" }));
	//div.appendChild(a2);
}

help.addStep("about", { "h": "about", "pf": drawAboutScreen, "width": UISCALE * 55, "height": UISCALE * 35 });
help.addTutorial("about", [ "about" ]);
help.addTopic("about", { "h": "about", "p": "about_p", "tutorial": "about" });

help.addTutorial("welcome", [ "tunein", "clickonsongtovote" ] );

help.addStep("setfavourite", { "h": "setfavourite", "p": "setfavourite_p", "modx": 8, "mody": -5 });
help.addStep("ratecurrentsong", { "h": "ratecurrentsong", "p": "ratecurrentsong_p", "height": UISCALE * 15, "modx": -4, "mody": -5 });

help.addStep("tunein", { "h": "tunein", "p": "tunein_p", "mody": 35, "skipf": function() { return user.p.radio_tunedin ? true : false; } } );
help.addStep("login", { "h": "login", "p": "login_p", "skipf": function() { return user.p.user_id > 1 ? true : false } });
help.addTutorial("ratecurrentsong", [ "register", "tunein", "ratecurrentsong", "setfavourite" ]);
help.addTopic("ratecurrentsong", { "h": "ratecurrentsong", "p": "ratecurrentsong_t", "tutorial": "ratecurrentsong", "modx": 6, "mody": -5, "skipf": function() { return user.p.radio_tunedin ? true : false; } });

// the openanalbum step and playlistsearch_v2 step are defined in the playlist.  the openplaylist step takes care of, well, opening the playlist
help.addStep("clicktorequest", { "h": "clicktorequest", "p": "clicktorequest_p" });
help.addStep("openplaylist", { "h": "openplaylist", "p": "openplaylist_p", "skipf": function() { if (edi.openPanelLink(true, "playlist")) return true; } });
help.addTutorial("request", [ "login", "tunein", "openplaylist", "playlistsearch_v2", "openanalbum", "clicktorequest" ]);
help.addTopic("request", { "h": "request", "p": "request_p", "tutorial": "request" });
