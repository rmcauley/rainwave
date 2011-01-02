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
	
	that.extend = function(name, func) {
		that[name] = func;
	}

	that.make = function(func, args, options) {
		var newfx = func.apply(this, args);
		
		newfx.from = 0;
		newfx.to = 0;
		newfx.timerid = false;
		newfx.started = 0;
		if (!newfx.duration) newfx.duration = 250;
		if (!options) options = {};
		
		newfx.now = 0;
		
		newfx.step = function() {
			var time = new Date().getTime();
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
		
		newfx.stop = function() {
			if (newfx.timerid) {
				clearInterval(newfx.timerid);
				newfx.timerid = false;
			}
		};
		
		newfx.set = function(nn) {
			newfx.stop();
			newfx.now = nn;
			newfx.update(nn);
		};
		
		newfx.start = function(stopat) {
			if (arguments.length == 2) {
				newfx.now = arguments[0];
				stopat = arguments[1];
			}
			if (newfx.timerid && options.unstoppable) return;
			newfx.stop();
			newfx.to = stopat;
			newfx.from = newfx.now;
			if (!that.enabled || (newfx.now == newfx.to)) {
				newfx.started = 0;
				newfx.step();
			}
			else {
				newfx.started = new Date().getTime();
				newfx.timerid = setInterval(newfx.step, 1000 / that.fps);
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
	
	that.p_fps = function(fps) {
		that.fps = parseInt(fps);
	};
	
	that.p_enabled = function(enabled) {
		that.enabled = enabled;
	};
	
	prefs.addPref("fx", { name: "fps", callback: that.p_fps, defaultvalue: 30, type: "dropdown", options: [ { value: "30", option: "30fps" }, { value: "40", option: "40fps" }, { value: "50", option: "50fps" } ] } );
	prefs.addPref("fx", { name: "enabled", callback: that.p_enabled, defaultvalue: true, type: "checkbox" });
	
	return that;
}