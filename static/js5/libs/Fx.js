var Fx = function() {
	"use strict";
	var self = {};
	self.delay_legacy_fx = false;
	var delayed_css = [];

	//*****************************************************************************
	//
	//  CSS3 Animation Support
	//
	//*****************************************************************************

	self.transform = function() {
		var transforms = [ "transform", "WebkitTransform", "msTransform", "MozTransform", "OTransform" ];
		var p = transforms.shift();
		var t = document.createElement("div");
		while (p) {
			if (typeof(t).style[p] !== "undefined") {
				return p;
			}
			p = transforms.shift();
		}
	}();

	var do_delayed_css = function() {
		for (var i = 0; i < delayed_css.length; i++) {
			delayed_css[i].el.style[delayed_css[i].attribute] = delayed_css[i].value;
		}
		delayed_css = [];
	};

	self.delay_css_setting = function(el, attribute, value) {
		if (attribute == "transform") {
			attribute = self.transform_string;
		}
		delayed_css.push({ "el": el, "attribute": attribute, "value": value });
		if (delayed_css.length == 1) {
			setTimeout(function() { requestAnimationFrame(do_delayed_css); }, 1);
		}
	};

	var transition_ends = [ "transitionend", "webkitTransitionEnd", "otransitionend" ];
	self.chain_transition = function(el, end_func) {
		var end_func_wrapper = function(e) {
			end_func(e, el);
			for (var i in transition_ends) {
				el.removeEventListener(transition_ends[i], end_func_wrapper, false);
			}
		};
		for (var i in transition_ends) {
			el.addEventListener(transition_ends[i], end_func_wrapper, false);
		}
		el._end_func_wrapper = end_func_wrapper;
	};

	// limitation: can only chain once
	self.chain_transition_css = function(el, property, value, end_func) {
		self.chain_transition(el, end_func);
		self.delay_css_setting(el, property, value);
	};

	self.stop_chain = function(el) {
		if (("_end_func_wrapper" in el) && (el._end_func_wrapper)) {
			for (var i in transition_ends) {
				el.removeEventListener(transition_ends[i], el._end_func_wrapper, false);
			}
			el._end_func_wrapper = null;
		}
	};

	self.remove_element = function(el) {
		var check = getComputedStyle(el);
		if (!check.getPropertyValue("transition-property") || (check.getPropertyValue("transition-property").indexOf("opacity") == -1)) {
			el.style.transition = "1s opacity";
		}
		self.chain_transition_css(el, "opacity", 0,
			function() {
				if (el.parentNode) el.parentNode.removeChild(el);
			}
		);
	};

	//*****************************************************************************
	//
	//  requestAnimationFrame Legacy Effects
	//
	//*****************************************************************************

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

		newfx.element = el;
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
		var init = false;

		r.set_rating = function(new_rating) {
			if (init) {
				r.start(new_rating);
			}
			else {
				r.set(new_rating);
				init = true;
			}
		};

		r.change_to_site_rating = function() {
			element.classList.remove("rating_user");
			element.classList.add("rating_site");
		};

		r.change_to_user_rating = function() {
			element.classList.remove("rating_site");
			element.classList.add("rating_user");
		};

		r.update = function(now) {
			// when updating here also make sure to update lists.js::AlbumList.update_item_element
			element.style.backgroundPosition = "18px " + (-(Math.round((Math.round(now * 10) / 2)) * 30)) + "px";
		};

		return r;
	};

	return self;
}();
