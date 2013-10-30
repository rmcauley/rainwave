'use strict';

var ErrorHandler = function() {
	var self = {};
	var container;
	var permanent_errors = [];

	self.initialize = function() {
		API.add_callback(that.permanent_error, "station_offline");
		API.add_universal_callback(that.tooltip_error);
	};

	that.permanent_error = function(json) {
		// TODO: this
	};

	// TODO: update this to be an actual modal error
	that.modal_error = that.permanent_error;

	that.tooltip_error = function(json) {
		var err = $el("div", { "class": "error_tooltip", "textContent": json.text });

		var x = Mouse.x;
		var y = Mouse.y;
		if (y < 30) y = 30;
		if (x > (window.innerWidth - err.offsetWidth)) x = window.innerWidth - err.offsetWidth - 15;
		if (y > (window.innerHeight - err.offsetHeight)) y = window.innerHeight - err.offsetHeight - 15;
		err.style.left = x + "px";
		err.style.top = y + "px";
	};

	that.doError = function(code, permanent, overrideclass, overridetext, overridetime) {
		if (!theme) {
			var crap = document.createElement("div");
			crap.textContent = "FATAL ERROR CODE " + code + " - please use http://rainwave.cc/forums/ or irc://irc.synirc.net/#rainwave to report this.";
			document.getElementById("body").appendChild(crap);
			return;
		}
		if (errors[code] && (!permanent)) {
			that.clearError(code);
		}
		if (!errors[code] || !permanent) {
			errors[code] = {};
			errors[code].el = document.createElement("div");
			errors[code].el.setAttribute("class", "err_div");
			if (overrideclass) errors[code].el.setAttribute("class", overrideclass);
			errors[code].permanent = permanent;
			that.positionErrors(errors[code]);
			that.drawError(errors[code], code, overridetext);
			if (permanent) {
				showing[code] = true;
				that.repositionPermanent();
			}
			else {
				var fortime = overridetime ? overridetime: 5000;
				timers[code] = setTimeout(function() { that.clearError(code); }, fortime);
			}

			if (!permanent || (permanent !== true)) {
				errors[code].el.addEventListener('click', function() { that.clearError(code); }, false);
				errors[code].el.style.cursor = 'pointer';
			}

			if (!permanent) {

			}
		}
	};

	that.repositionPermanent = function() {
		var ry = parseInt(showy);
		for (var code in showing) {
			errors[code].el.style.left = showx + "px";
			errors[code].el.style.top = ry + "px";
			ry += errors[code].el.offsetHeight + (UISCALE / 2);
		}
	};

	that.positionErrors = function() {
		var runy = 0;
		for (var i in errors) {
			if (errors[i].permanent) {
				errors[i].el.style.top = showy + runy + "px";
				runy += errors[i].el.offsetHeight;
			}
		}
	};

	that.clearError = function(code) {
		if (errors[code]) {
			that.unshowError(errors[code]);
			delete(errors[code]);
		}
		if (timers[code]) {
			clearTimeout(timers[code]);
			delete(timers[code]);
		}
		if (showing[code]) {
			delete(showing[code]);
			that.positionErrors();
		}
	};

	that.deleteError = function(error) {
		BODY.removeChild(error.el);
	};

	that.jsError = function(err, json) {
		var el = createEl("div", { "class": "err_div", "style": "z-index: 100000; top: 0px; left: 0px;" });
		el.appendChild(createEl("div", { "textContent": _l("crashed"), "style": "padding-bottom: 1em;" }));
		if (err.message && err.name && err.stack) {
			el.appendChild(createEl("div", { "textContent": _l("submiterror"), "style": "padding-bottom: 1em;" }));
			el.appendChild(createEl("textarea", { "textContent": err.message + "\n" + err.name + "\n\n" + err.stack + "\n\nServer response:\n" + JSON.stringify(json) + "\n", "style": "width: 40em; height: 15em; margin-bottom: 1em;" }));
		}
		el.appendChild(createEl("div", { "textContent": _l("pleaserefresh") }));
		BODY.appendChild(el);
		lyre.sync_stop = true;
	};

	return that;
}();
