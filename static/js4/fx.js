'use strict';

var Fx = function() {
	var self = {};

	//*****************************************************************************
	//
	//  CSS3 Animation Support
	//
	//*****************************************************************************

	//var transforms = [ "transform", "WebkitTransform", "msTransform", "MozTransform", "OTransform" ];
	//var p;
	//while (p = transforms.shift()) {
	//	if (typeof el.style[p] != 'undefined') {
	//		return p;
	//	}
	//}

	var animation_ends = [ "animationend", "webkitAnimationEnd", "oanimationend", "MSAnimationEnd" ]
	self.remove_element = function(el) {
		var end_func = function() {
			el.parentNode.removeChild(el);
		};
		for (animation_end in animation_ends) {
			el.addEventListener(animation_end, end_func, false);
		}
		el.style.opacity = "0";
	};

	//*****************************************************************************
	//
	//  requestAnimationFrame Legacy Effects
	//
	//*****************************************************************************

	/* Sample usage:

	fxOne = fx.make(fx.SVGAttrib, svgnode, 250, "opacity");		// 4th argument onward gets passed to effect constructor
	fxOne.set(1);
	fxOne.start(0);
	*/

	var requestAnimationFrame = windows.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
	var performance = window.performance || { "now": function() { return new Date().getTime(); } };
	if (!requestAnimationFrame) {
		requestAnimationFrame = function(callback) { window.setTimeout(callback, 40); };
	}
	
	self.legacy_effect = function(effect, el, duration) {
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
			var temptime = performance.now();
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
			step(started);
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
	
	self.BackgroundPosX = function(element) {
		var bx = {};
		if (!element._fx_bkgy) element._fx_bkgy = 0;

		bx.update = function(now) {
			element.style.backgroundPosition = now + "px " + element._fx_bkgy + "px";
			element._fx_bkgx = now;
		};
		
		return bx;
	};
	
	self.BackgroundPosY = function(element) {
		var by = {};
		if (!element._fx_bkgx) element._fx_bkgx = 0;

		by.update = function(now) {
			element.style.backgroundPosition = element._fx_bkgx + "px " + now + "px";
			element._fx_bkgy = now;
		};
		
		return by;
	};

	return self;
}();
