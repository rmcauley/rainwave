/* Sample usage:

fxOne = fx.make(fx.SVGAttrib, svgnode, 250, "opacity");		// 4th argument onward gets passed to effect constructor
fxOne.set(1);
fxOne.start(0);
*/

var fx = function() {
	var that = {};
	that.enabled = true;
	var timer = false;
	var started = false;

	var requestFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
	var browsersupport = true;
	if (!requestFrame) {
		browsersupport = false;
		requestFrame = function(callback) {
			window.setTimeout(callback, 1000 / 30);
		};
	}
	
	that.extend = function(name, func) {
		that[name] = func;
	}

	that.make = function(func, el, duration) {
		var newfx;
		if (arguments.length > 3) {
			var args = [ el ];
			for (var i = 3; i < arguments.length; i++) args.push(arguments[i])
			newfx = func.apply(this, args);
		}
		else {
			newfx = func(el);
		}
		
		var from = 0;
		var to = 0;
		var now = 0;
		var delta = 0;
		var started = 0;
		
		newfx.duration = duration;
		newfx.unstoppable = false;
		if (!("onStart" in newfx)) newfx.onStart = false;
		if (!("onComplete" in newfx)) newfx.onComplete = false;
		if (!("onSet" in newfx)) newfx.onSet = false;
		
		var step = function(time) {
			if (!time) time = new Date().getTime(); // Irish has this as *.002 for some reason... not sure why...
			
			if ((time < (started + duration)) && (now != to)) {
				// Stolen from Robert Penner's Programming Macromedia Flash MX p.210:
				// now = -delta * (time /= duration) * (time - 2) + from;
				// can't get the damned thing to work, though, so we're sticking with what works which was stolen from MooTools:
				// (who probably stole it from Penner but hey, that's the way it goes :) )
				var delta2 = -(Math.cos(Math.PI * ((time - started) / duration)) - 1) / 2;
				now = (to - from) * delta2 + from;

				newfx.update(now);
				newfx.now = now;
				requestFrame(step);
			}
			else {
				newfx.stop();
			}
		};
		
		newfx.stop = function() {
			now = to;
			newfx.update(now);
			if (newfx.onComplete) newfx.onComplete(now);
			newfx.now = now;
		};
		
		newfx.set = function(nn) {
			now = nn;
			to = nn;
			if (newfx.onSet) newfx.onSet(now);
			newfx.update(nn);
			newfx.now = now;
		};
		
		newfx.start = function(stopat) {
			var time = new Date().getTime();
			if (time < (started + duration)) {
				if (newfx.unstoppable) return;
				if (to == stopat) return;
				newfx.stop();
			}
			if (arguments.length == 2) {
				now = arguments[0];
				stopat = arguments[1];
			}
			started = time;
			to = stopat;
			from = now;
			delta = to - from;
			if (newfx.onStart) newfx.onStart(now);
			if (!that.enabled) now = to;
			step();
		};
		
		return newfx;
	};
	
	// ************************************************************** ANIMATION FUNCTIONS

	that.SVGAttrib = function(element, attribute, unit) {
		if (!unit) unit = "";
	
		var svgafx = {};
		svgafx.update = function(now) {
			element.setAttribute(attribute, now + unit);
		};
		
		return svgafx;
	};

	that.SVGTranslateY = function(element, x) {
		var svgyfx = {};
		
		svgyfx.update = function(now) {
			element.setAttribute("transform", "translate(" + x + ", " + Math.floor(now) + ")");
		};
		
		return svgyfx;
	};
	
	that.SVGTranslateX = function(element, y) {
		var svgxfx = {};
	
		svgxfx.update = function(now) {
			element.setAttribute("transform", "translate(" + Math.floor(now) + ", " + y + ")");
		};
		
		return svgxfx;
	};
	
	that.CSSNumeric = function(element, attribute, unit) {
		var cssnfx = {};
		if (!unit) unit = "";
		
		if (attribute == "opacity") {		
			cssnfx.update = function(now) {
				element.style[attribute] = now.toFixed(2) + unit;
			};
		}
		else if (unit == "px") {
			cssnfx.update = function(now) {
				element.style[attribute] = Math.round(now) + unit;
			};
		}
		else {
			cssnfx.update = function(now) {
				element.style[attribute] = now + unit;
			};
		}
		
		return cssnfx;
	};
	
	that.OpacityRemoval = function(element, owner) {
		var orfx = {};
		
		element.style.opacity = "0";
		var added = false;
		
		orfx.onSet = function(now) {
			if ((now > 0) && !added) {
				owner.appendChild(element);
				added = true;
			}
			else if ((now == 0) && added) {
				owner.removeChild(element);
				added = false;
			}
		};
		
		orfx.onStart = function(now) {
			if ((now == 0) && !added) {
				owner.appendChild(element);
				added = true;
			}
		};
		
		orfx.update = function(now) {
			element.style.opacity = now.toFixed(2);
		};
		
		orfx.onComplete = function(now) {
			if ((now == 0) && added) {
				owner.removeChild(element);
				added = false;
			}
			if (typeof(orfx.onComplete2) == "function") orfx.onComplete2();
		};

		return orfx;		
	};
	
	that.BackgroundPosX = function(element) {
		var bx = {};
		if (!element._fx_bkgy) element._fx_bkgy = 0;

		bx.update = function(now) {
			element.style.backgroundPosition = now + "px " + element._fx_bkgy + "px";
			element._fx_bkgx = now;
		};
		
		return bx;
	};
	
	that.BackgroundPosY = function(element) {
		var by = {};
		if (!element._fx_bkgx) element._fx_bkgx = 0;

		by.update = function(now) {
			element.style.backgroundPosition = element._fx_bkgx + "px " + now + "px";
			element._fx_bkgy = now;
		};
		
		return by;
	};
	
	var CSSTransform = function(el) {
		if (!el._fx_csstrans) {
			el._fx_csstrans = { "scale": 1, "translatex": 0, "translatey": 0 };
		}
		
		var transkey = false;
		var threed = false;
		/*if ("MozTransform" in el.style) {
			transkey = 'MozTransform';
		}*/
		if ("webkitTransform" in el.style) {
			transkey = 'webkitTransform';
			threed = true;
		}
		if ("OTransform" in el.style) {
			transkey = "OTransform";
		}
		else return false;
		
		var csstfx = {};
		
		csstfx.doTransform = function() {
			var t = "";
			t += "scale(" + el._fx_csstrans.scale + ") ";
			//t += "rotate(" + el._fx_csstrans.rotate + "deg) ";
			t += "translate(" + el._fx_csstrans.translatex + "px, " + el._fx_csstrans.translatey + "px)";
			//t += "skew(" + el._fx_csstrans.skewx + "deg " + el._fx_csstrans.skewy + "deg) ";
			if (threed) t += "translate3d(0,0,0) ";
			el.style[transkey] = t;
		};
		
		return csstfx;
	}
	
	that.CSSScale = function(el) {
		var scalefx = CSSTransform(el);
		
		if (!scalefx) {
			return { "update": function() { return false; } };
		}
		
		scalefx.update = function(now) {
			el._fx_csstrans.scale = now;
			scalefx.doTransform();
		};
		return scalefx;
	};
	
	that.CSSTranslateX = function(el) {
		var txfx = CSSTransform(el);
		
		if (!txfx) {
			return that.CSSNumeric(el, "left", "px");
		}
		
		txfx.update = function(now) {
			el._fx_csstrans.translatex = Math.round(now);
			txfx.doTransform();
		};
		return txfx;
	};
	
	that.CSSTranslateY = function(el) {
		var tyfx = CSSTransform(el);
		
		if (!tyfx) {
			return that.CSSNumeric(el, "top", "px");
		}
		
		tyfx.update = function(now) {
			el._fx_csstrans.translatey = Math.round(now);
			tyfx.doTransform();
		};
		return tyfx;
	};
	
	// ************************************************************** MISC FUNCTIONS
	
	// this menuheight thing only works so long as 1 menu is on the page...
	var menuheight = false;
	that.makeMenuDropdown = function(menu, header, dropdown, options) {
		if (!menuheight) menuheight = menu.offsetHeight;
		var timeout = 0;
		var fx_pulldown = that.make(that.CSSTranslateY, dropdown, 250);
		fx_pulldown.set(-menuheight - 1);
		var fx_opacity = that.make(that.OpacityRemoval, dropdown, 250, menu);
		var mouseover = function(e) {
			if (e && ("pageX" in e) && ("pageY" in e) && (e.pageX == 0) && (e.pageY == 0)) return; 		// webkit bugfix that triggers menu hover on page load
			clearTimeout(timeout);
			if (options && options.checkbefore) {
				if (!options.checkbefore) return;
			}
			dropdown.style.left = help.getElPosition(header).x + "px";
			fx_pulldown.start(0);
			fx_opacity.start(1);
		};
		var mouseout = function() {
			fx_pulldown.start(-menuheight - 1);
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
	
	// ************************************************************** PREFS
	
	that.p_fps = function(fps) {
		that.fps = parseInt(fps);
	};
	
	that.p_enabled = function(enabled) {
		that.enabled = enabled;
	};
	
	prefs.addPref("fx", { name: "fps", hidden: browsersupport, callback: that.p_fps, defaultvalue: 30, type: "dropdown", options: [ { "value": "15", "option": "15fps" }, { value: "30", option: "30fps" }, { value: "45", option: "45fps" }, { value: "60", option: "60fps" } ] } );
	prefs.addPref("fx", { name: "enabled", callback: that.p_enabled, defaultvalue: true, type: "checkbox" });
	
	// **************************************************************
	
	return that;
}();