/* Sample usage:

fx = R3Effects();
fxOne = fx.make(fx.SVGAttrib, [ svgnode, 250, "opacity" ]);
fxOne.set(1);
fxOne.start(0);
*/

var fx = function() {
	var that = {};
	that.fps = 30;
	that.enabled = true;
	var idmax = 0;
	var runningfx = {};
	var timer = false;
	var started = false;
	var fpscounter = 0;
	var deferred = []
	var mozAnim = window.mozRequestAnimationFrame ? true : false;
	
	that.extend = function(name, func) {
		that[name] = func;
	}
	
	var stopEffect = function(id) {
		if (runningfx[id]) delete(runningfx[id]);
	}
	
	var isEffectRunning = function(id) {
		if (runningfx[id]) return true;
		else return false;
	}
	
	var globalStep = function(event) {
		var time;
		if (event && event.timeStamp) time = event.timeStamp;
		else time = new Date().getTime();
		var c = 0;
		var i;
		for (i in runningfx) {
			runningfx[i](time);
			c++;
		}
		for (i in deferred) deferred[i]();
		deferred = [];
		fpscounter++;
		if (c == 0) {
			if (mozAnim) window.removeEventListener("MozBeforePaint", globalStep, false);
			else clearInterval(timer);
			timer = false;
			//log.log("Fx", 0, "Avg FPS: " + Math.round(fpscounter / ((time - started) / 1000)));
		}
		else if (mozAnim) {
			window.mozRequestAnimationFrame();
		}
	}
	
	var startEffect = function(id, func) {
		runningfx[id] = func;
		if (!timer) {
			fpscounter = 0;
			if (mozAnim) {
				started = window.mozAnimationStartTime;
				window.addEventListener("MozBeforePaint", globalStep, false);
				window.mozRequestAnimationFrame();
				timer = true;
			}
			else {
				started = new Date().getTime();	
				timer = setInterval(globalStep, Math.ceil(1000 / that.fps));
			}
		}
	}
	
	that.renderF = function(func) {
		if (timer) deferred.push(func);
		else func();
	}
	
	that.renderTC = function(el, tc) {
		that.renderF(function() { el.textContent = tc });
	}
	
	that.renderA = function(el, attrib, value) {
		that.renderF(function() { el.setAttribute(attrib, value); });
	};

	that.make = function(func, args, options) {
		var newfx = func.apply(this, args);
		
		newfx.id = idmax;
		idmax++;
		
		newfx.from = 0;
		newfx.to = 0;
		newfx.now = 0;
		if (!newfx.duration) newfx.duration = 250;
		if (!options) options = {};
		
		newfx.step = function(time) {
			if ((time < (newfx.started + newfx.duration)) && (newfx.now != newfx.to)) {
				var delta = 0;
				if (typeof(newfx.transition) == "function") delta = newfx.transition(newfx.time, newfx.started, newfx.duration);
				// algorithm ripped from MooTools
				else delta = -(Math.cos(Math.PI * ((time - newfx.started) / newfx.duration)) - 1) / 2;
				newfx.now = (newfx.to - newfx.from) * delta + newfx.from;
				newfx.update(newfx.now);
			}
			else {
				newfx.now = newfx.to;
				newfx.update(newfx.now);
				newfx.stop();
			}
		};
		
		newfx.stop = function() {
			stopEffect(newfx.id);
			if (typeof(newfx.onComplete) == "function") {
				newfx.onComplete();
			}
		};
		
		newfx.set = function(nn) {
			if (isEffectRunning(newfx.id)) {
				newfx.now = nn;
				newfx.to = nn;
			}
			else {
				newfx.now = nn;
				if (typeof(newfx.onSet) == "function") newfx.onSet(nn);
				newfx.update(nn);
			}
		};
		
		newfx.start = function(stopat) {
			if (isEffectRunning(newfx.id)) {
				if (options.unstoppable) return;
				if (newfx.to == stopat) return;
				newfx.stop();
			}
			if (arguments.length == 2) {
				newfx.now = arguments[0];
				stopat = arguments[1];
			}
			newfx.to = stopat;
			newfx.from = newfx.now;
			if (typeof(newfx.onStart) == "function") {
				newfx.onStart();
			}
			if (!that.enabled || (newfx.now == newfx.to)) {
				newfx.started = 0;
				newfx.step();
			}
			else {
				if (mozAnim) newfx.started = window.mozAnimationStartTime;
				else newfx.started = new Date().getTime();
				startEffect(newfx.id, newfx.step);
			}
		};
		
		return newfx;
	};

	that.SVGAttrib = function(element, duration, attribute, unit) {
		if (!unit) unit = "";
	
		var svgafx = {};
		svgafx.duration = duration;
		svgafx.update =function() {
			element.setAttribute(attribute, svgafx.now + unit);
		};
		
		return svgafx;
	};

	that.SVGTranslateY = function(element, duration, x) {
		var svgyfx = {};
		svgyfx.duration = duration;
		svgyfx.update = function() {
			element.setAttribute("transform", "translate(" + x + ", " + Math.floor(svgyfx.now) + ")");
		};
		
		return svgyfx;
	};
	
	that.SVGTranslateX = function(element, duration, y) {
		var svgxfx = {};
		svgxfx.duration = duration;
		svgxfx.update = function() {
			element.setAttribute("transform", "translate(" + Math.floor(svgxfx.now) + ", " + y + ")");
		};
		
		return svgxfx;
	};
	
	that.CSSNumeric = function(element, duration, attribute, unit) {
		var cssnfx = {};
		cssnfx.duration = duration;
		cssnfx.update = function() {
			element.style[attribute] = cssnfx.now + unit;
		};
		
		return cssnfx;
	};
	
	that.OpacityRemoval = function(element, owner, duration) {
		var orfx = {};
		orfx.duration = duration;
		element.style.opacity = "0";
		var added = false;
		
		orfx.onSet = function() {
			if ((orfx.now > 0) && !added) {
				owner.appendChild(element);
				added = true;
			}
			else if ((orfx.now == 0) && added) {
				owner.removeChild(element);
				added = false;
			}
		};
		
		orfx.onStart = function() {
			if ((orfx.now == 0) && !added) {
				owner.appendChild(element);
				added = true;
			}
		};
		
		orfx.update = function() {
			element.style.opacity = orfx.now;
		};
		
		orfx.onComplete = function() {
			if ((orfx.now == 0) && added) {
				owner.removeChild(element);
				added = false;
			}
			if (typeof(orfx.onComplete2) == "function") orfx.onComplete2();
		};

		return orfx;		
	};
	
	that.BackgroundPosX = function(element, duration) {
		var bx = {};
		bx.duration = duration;
		var y = 0;
		
		bx.onStart = function() {
			y = parseInt(element.style.backgroundPosition.split(" ")[1]);
			if (isNaN(y)) y = 0;
		};
		
		bx.onSet = bx.onStart;
		
		bx.update = function() {
			element.style.backgroundPosition = bx.now + "px " + y + "px";
		};
		
		return bx;
	};
	
	that.BackgroundPosY = function(element, duration) {
		var by = {};
		by.duration = duration;
		var x = 0;
		
		by.onStart = function() {
			x = parseInt(element.style.backgroundPosition.split(" ")[0]);
			if (isNaN(x)) x = 0;
		};
		
		by.onSet = by.onStart;
		
		by.update = function() {
			element.style.backgroundPosition = x + "px " + by.now + "px";
		};
		
		return by;
	};
	
	that.makeMenuDropdown = function(menu, header, dropdown, options) {
		var timeout = 0;
		var fx_pulldown = fx.make(fx.CSSNumeric, [ dropdown, 250, "top", "px" ]);
		fx_pulldown.set(0);
		var fx_opacity = fx.make(fx.OpacityRemoval, [ dropdown, menu, 250 ]);
		var mouseover = function() {
			clearTimeout(timeout);
			if (options && options.checkbefore) {
				if (!options.checkbefore) return;
			}
			dropdown.style.left = help.getElPosition(header).x + "px";
			fx_pulldown.start(menu.offsetHeight - 1);
			fx_opacity.start(1);
		};
		var mouseout = function() {
			fx_pulldown.start(0);
			fx_opacity.start(0);
		};
		header.addEventListener("mouseover", mouseover, true);
		header.addEventListener("mouseout", function() { clearTimeout(timeout); timeout = setTimeout(mouseout, 250); }, true);
		header.style.cursor = "default";
		if (dropdown) {
			dropdown.addEventListener("mouseover", mouseover, true);
			dropdown.addEventListener("mouseout", function() { clearTimeout(timeout); timeout = setTimeout(mouseout, 250); }, true);
		}
	};
	
	that.p_fps = function(fps) {
		that.fps = parseInt(fps);
	};
	
	that.p_enabled = function(enabled) {
		that.enabled = enabled;
	};
	
	prefs.addPref("fx", { name: "fps", hidden: mozAnim, callback: that.p_fps, defaultvalue: 30, type: "dropdown", options: [ { "value": "15", "option": "15fps" }, { value: "30", option: "30fps" }, { value: "45", option: "45fps" }, { value: "60", option: "60fps" } ] } );
	prefs.addPref("fx", { name: "enabled", callback: that.p_enabled, defaultvalue: true, type: "checkbox" });
	
	return that;
}();