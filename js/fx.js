/* Sample usage:

fxOne = fx.make(fx.SVGAttrib, svgnode, 250, "opacity");		// 4th argument onward gets passed to effect constructor
fxOne.set(1);
fxOne.start(0);
*/

var fx = function() {
	var that = {};
	that.enabled = true;
	
	that.css_transition = false;
	that.transform = false;
	that.transform_3d = false;
	that.css_animation = false;
	that.animation_string = 'animation';
	that.transform_string = 'transform';
	that.transition_string = 'transition';
	var dom_prefixes = 'Webkit Moz O ms Khtml'.split(' ');
	that.dom_prefix  = '';
	var temp_el = document.createElement("div");
	if (temp_el.style.animationName) { that.css_animation = true; }
	if (temp_el.style.transform) { that.transform = true; } 
	if (temp_el.style.transition) { that.css_transition = true; }    

	for (var i = 0; i < dom_prefixes.length; i++) {
		if (!that.css_transition && (temp_el.style[dom_prefixes[i] + "Transition"] !== undefined)) {
			that.dom_prefix = dom_prefixes[i];
			that.transition_string = that.dom_prefix + 'Transition';
			that.css_transition = true;
		}
		if (!that.css_animation && (temp_el.style[dom_prefixes[i] + 'AnimationName' ] !== undefined)) {
			that.dom_prefix = dom_prefixes[i];
			that.animation_string = that.dom_prefix + 'Animation';
			that.css_animation = true;
		}
		if (!that.transform && (temp_el.style[dom_prefixes[i] + 'Transform'] !== undefined)) {
			that.dom_prefix = dom_prefixes[i];
			that.transform_string = that.dom_prefix + 'Transform';
			that.transform = true;
			if (that.dom_prefix == "Webkit") {
				that.transform_3d = true;
			}
		}
	}

	var requestFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
	if (!requestFrame) {
		requestFrame = function(callback) {
			window.setTimeout(callback, 40);
		};
	}
	
	that.extend = function(name, func) {
		that[name] = func;
	};
	
	that.addCSSKeyframe = function(keyframe) {
		if (document.styleSheets && document.styleSheets.length) {
			document.styleSheets[0].insertRule(keyframe, 0);
		} else {
			var s = document.createElement('style');
			s.innerHTML = keyframe;
			document.getElementsByTagName('head')[0].appendChild(s);
		}
	};

	that.make = function(func, el, duration) {
		duration = Math.round(duration * 0.8);		// because I like effects to be fast
		var newfx;
		if (arguments.length > 3) {
			var args = [ el ];
			for (var i = 3; i < arguments.length; i++) { args.push(arguments[i]); }
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
		newfx.stop_timer = false;
		if (!("onStart" in newfx)) newfx.onStart = false;
		if (!("onComplete" in newfx)) newfx.onComplete = false;
		if (!("onSet" in newfx)) newfx.onSet = false;

		if (that.css_transition && newfx.transition_name) {
			if (!("_transition_string" in el)) {
				el._transition_string = "";
			}
			else {
				el._transition_string += ", ";
			}
			el._transition_string += newfx.transition_name + " " + duration + "ms ease-out";
			el.style[that.transition_string] = el._transition_string;
		}
		
		if (that.css_animation && newfx.animation_name) {
			if (!("_animation_string" in el)) {
				el._animation_string = "";
			}
			else {
				el._animation_string += ", ";
			}
			el._animation_string += newfx.animation_name + " " + duration + "ms ease-out";
			el.style[that.animation_string] = el._animation_string;
		}
		
		// these are the same for all types of transforms
		newfx.stop = function() {
			if (newfx.stop_timer) clearTimeout(newfx.stop_timer);
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
			var temptime = new Date().getTime();
			if (arguments.length == 2) {
				now = arguments[0];
				stopat = arguments[1];
			}
			if (temptime < (started + duration)) {
				if (newfx.unstoppable) return;
				if (to == stopat) return;
				newfx.stop();
			}
			started = temptime;
			to = stopat;
			from = now;
			delta = to - from;
			if (newfx.onStart) newfx.onStart(now);
			
			if (that.css_transition && newfx.transition_name) {
				newfx.set(to);
				newfx.stop_timer = setTimeout(newfx.stop, duration);
			}
			else {
				if (!that.enabled) now = to;
				step();
			}
		};
		
		var step = function(steptime) {
			if (!steptime) steptime = new Date().getTime();
			
			if ((steptime < (started + duration)) && (now != to)) {
				// This is all Robert Penner's work, as you might imagine...
				// First formula: sinOut
				//var delta2 = -(Math.cos(Math.PI * ((steptime - started) / duration)) - 1) / 2;
				//now = (to - from) * delta2 + from;
				// Second formula: quintOut
				//now = (to - from) * ((steptime = (steptime - started) / duration - 1) * steptime * steptime * steptime * steptime + 1) + from;
				// Third formula: quadOut
				var timeoverduration = (steptime - started) / duration;
				now = -(to - from) * timeoverduration * (timeoverduration - 2) + from;

				newfx.update(now);
				newfx.now = now;
				requestFrame(step);
			}
			else {
				now = to;
				newfx.update(now);
				newfx.stop();
			}
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
		cssnfx.transition_name = attribute;
		
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
		orfx.transition_name = "opacity";
		
		element.style.opacity = "0";
		var added = false;
		
		orfx.onSet = function(now) {
			if ((now > 0) && !added) {
				orfx.addToEl();
				added = true;
			}
			else if ((now == 0) && added) {
				orfx.removeFromEl();
				added = false;
			}
		};
		
		orfx.removeFromEl = function() {
			owner.removeChild(element);
		};
		
		orfx.addToEl = function() {
			owner.appendChild(element);
		};
		
		orfx.onStart = function(now) {
			if ((now == 0) && !added) {
				orfx.addToEl();
				added = true;
			}
		};
		
		orfx.update = function(now) {
			element.style.opacity = now.toFixed(2);
		};
		
		orfx.onComplete = function(now) {
			if ((now == 0) && added) {
				orfx.removeFromEl();
				added = false;
			}
			if (typeof(orfx.onComplete2) == "function") orfx.onComplete2();
		};

		return orfx;		
	};
	
	that.OpacityHide = function(element, owner) {
		var orfx = that.OpacityRemoval(element, owner);
		
		orfx.removeFromEl = function() {
			element.style.display = "none";
		};
		
		orfx.addToEl = function() {
			element.style.display = "block";
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
		if (!that.transform) return false;
		
		if (!el._fx_csstrans) {
			el._fx_csstrans = { "scale": 1, "translatex": 0, "translatey": 0 };
		}
		
		var csstfx = {};
		
		csstfx.doTransform = function() {
			var t = "";
			t += "scale(" + el._fx_csstrans.scale + ") ";
			//t += "rotate(" + el._fx_csstrans.rotate + "deg) ";
			t += "translate(" + el._fx_csstrans.translatex + "px, " + el._fx_csstrans.translatey + "px)";
			//t += "skew(" + el._fx_csstrans.skewx + "deg " + el._fx_csstrans.skewy + "deg) ";
			if (that.transform_3d) t += "translate3d(0,0,0) ";
			el.style[that.transform_string] = t;
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
		var txfx = false;
		if (!that.css_transition) {
			var txfx = CSSTransform(el);
		}
		
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
		var tyfx = false;
		if (!that.css_transition) {
			tyfx = CSSTransform(el);
		}
		
		if (!tyfx) {
			return that.CSSNumeric(el, "top", "px");
		}
		
		tyfx.update = function(now) {
			el._fx_csstrans.translatey = Math.round(now);
			tyfx.doTransform();
		};
		return tyfx;
	};
	
	// ************************************************************** PREFS
	
	that.p_enabled = function(enabled) {
		that.enabled = enabled;
	};
	
	if (!that.css_transition) {
		prefs.addPref("fx", { "name": "enabled", "callback": that.p_enabled, "defaultvalue": true, "type": "checkbox" });
	}
	
	// **************************************************************
	
	return that;
}();