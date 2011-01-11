/* Sample usage:

fx = R3Effects();
fxOne = fx.make(fx.SVGAttrib, [ svgnode, 250, "opacity" ]);
fxOne.set(1);
fxOne.start(0);
*/

function R3Effects() {
	var that = {};
	that.fps = 30;
	that.enabled = true;
	var idmax = 0;
	var runningfx = {};
	var timer = false;
	var started = false;
	var fpscounter = 0;
	var deferred = []
	
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
	
	var globalStep = function() {
		var time = new Date().getTime();
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
			clearInterval(timer);
			timer = false;
			log.log("Fx", 0, "Avg FPS: " + Math.round(fpscounter / ((time - started) / 1000)));
		}
	}
	
	var startEffect = function(id, func) {
		runningfx[id] = func;
		if (!timer) {
			started = new Date().getTime();
			fpscounter = 0;
			timer = setInterval(globalStep, 1000 / Math.ceil(that.fps));
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
				if (typeof(newfx.onComplete) == "function") {
					newfx.onComplete();
				}
			}
		};
		
		newfx.stop = function() { stopEffect(newfx.id); };
		
		newfx.set = function(nn) {
			if (isEffectRunning(newfx.id)) {
				newfx.now = nn;
				newfx.to = nn;
			}
			else {
				newfx.now = nn;
				newfx.update(nn);
			}
		};
		
		newfx.start = function(stopat) {
			if (isEffectRunning(newfx.id) && options.unstoppable) return;
			if (arguments.length == 2) {
				newfx.now = arguments[0];
				stopat = arguments[1];
			}
			newfx.stop();
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
				newfx.started = new Date().getTime();
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
		
		orfx.onStart = function() {
			if (orfx.now == 0) owner.appendChild(element);
		};
		
		orfx.update = function() {
			element.style.opacity = orfx.now;
		};
		
		orfx.onComplete = function() {
			if (orfx.now == 0) owner.removeChild(element);
		};

		return orfx;		
	};
	
	that.makeMenuDropdown = function(menu, header, dropdown) {
		var timeout = 0;
		var fx_pulldown = fx.make(fx.CSSNumeric, [ dropdown, 250, "top", "px" ]);
		fx_pulldown.set(0);
		var fx_opacity = fx.make(fx.OpacityRemoval, [ dropdown, menu, 250 ]);
		var mouseover = function() {
			clearTimeout(timeout);
			fx_pulldown.start(menu.offsetHeight - 1);
			fx_opacity.start(1);
		};
		var mouseout = function() {
			fx_pulldown.start(0);
			fx_opacity.start(0);
		};
		header.addEventListener("mouseover", mouseover, true);
		header.addEventListener("mouseout", function() { clearTimeout(timeout); timeout = setTimeout(mouseout, 250); }, true);
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
	
	prefs.addPref("fx", { name: "fps", callback: that.p_fps, defaultvalue: 30, type: "dropdown", options: [ { "value": "15", "option": "15fps" }, { value: "30", option: "30fps" }, { value: "45", option: "45fps" }, { value: "60", option: "60fps" } ] } );
	prefs.addPref("fx", { name: "enabled", callback: that.p_enabled, defaultvalue: true, type: "checkbox" });
	
	return that;
}