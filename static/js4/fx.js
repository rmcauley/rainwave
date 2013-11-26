'use strict';

var Fx = function() {
	var self = {};
	var delayed_css = [];

	var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame;
	var performance = window.performance || { "now": function() { return new Date().getTime(); } };
	if (!requestAnimationFrame) {
		requestAnimationFrame = function(callback) { window.setTimeout(callback, 40); };
	}

	//*****************************************************************************
	//
	//  CSS3 Animation Support
	//
	//*****************************************************************************

	var transform_string;

	var get_transform_string = function() {
		var transforms = [ "transform", "WebkitTransform", "msTransform", "MozTransform", "OTransform" ];
		var p;
		while (p = transforms.shift()) {
			if (typeof $id("measure_box").style[p] != 'undefined') {
				return p;
			}
		}
	}

	self.initialize = function() {
		transform_string = get_transform_string();
	}

	var do_delayed_css = function() {
		for (var i = 0; i < delayed_css.length; i++) {
			delayed_css[i].el.style[delayed_css[i].attribute] = delayed_css[i].value;
		}
		delayed_css = [];
	}

	self.delay_css_setting = function(el, attribute, value) {
		if (attribute == "transform") {
			attribute = transform_string;
		}
		delayed_css.push({ "el": el, "attribute": attribute, "value": value });
		if (delayed_css.length == 1) {
			requestAnimationFrame(do_delayed_css);
		}
	}

	var animation_ends = [ "animationend", "webkitAnimationEnd", "oanimationend", "MSAnimationEnd" ]
	self.remove_element = function(el) {
		var end_func = function() {
			el.parentNode.removeChild(el);
		};
		for (var animation_end in animation_ends) {
			el.addEventListener(animation_end, end_func, false);
		}
		self.delay_css_setting(el, "opacity", 0);
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
	
	self.legacy_effect = function(effect, el, duration) {
		var newfx;
		if (!duration) {
			duration = 700;
		}
		if (arguments.length > 3) {
			var args = [ el ];
			for (var i = 3; i < arguments.length; i++) { args.push(arguments[i]); }
			newfx = effect.apply(self, args);
		}
		else {
			newfx = effect(el);
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
				requestAnimationFrame(step);
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

	self.Rating = function(element) {
		var r = {};
		r.fave_is_on = false;
		var current_rating;
		var fave_class;
		var rating_class;

		r.set_rating = function(new_rating) {
			current_rating = new_rating;
			r.start(current_rating);
		};

		r.change_to_site_rating = function() {
			rating_class = "rating_site";
			element.setAttribute("class", rating_class + " " + fave_class);
		};

		r.change_to_user_rating = function() {
			rating_class = "rating_user";
			element.setAttribute("class", rating_class + " " + fave_class);
		};

		r.set_fave = function(fave) {
			if (fave) fave_class = "rating_fave";
			else fave_class = "";
			element.setAttribute("class", rating_class + " " + fave_class);
		};

		r.fave_mouse_over = function() {
			element.setAttribute("class", rating_class + " fave_hover");
		};

		r.fave_mouse_out = function() {
			element.setAttribute("class", rating_class + " " + fave_class);
		};

		r.update = function(now) {
			element.style.backgroundPosition = "-" + (Math.round((Math.round(now * 10) / 2)) * 25) + "px 0px";
		};

		return r;
	}
	
	return self;
}();
