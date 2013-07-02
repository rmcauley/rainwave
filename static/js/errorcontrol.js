// TODO: Finish standardizing API4 error handling, then redo this file
var errorcontrol = function() {
	var that = {};
	var errors = {};
	var showx = 0;
	var showy = 24;
	var timers = {};
	var showing = {};
	
	theme.Extend.ErrorControl(that);
	
	that.changeShowXY = function(x, y) {
		showx = x;
		showy = y;
	};
	
	that.setupCallbacks = function() {
		lyre.addCallback(that.lyreError, "error");
		lyre.addCallback(that.clearError2, "user");
		lyre.addCallback(that.genericR4Result, "request_result");
		lyre.addCallback(that.voteresult, "vote_result");
		lyre.addCallback(that.rateresult, "rate_result");
		lyre.addCallback(that.requestorderresult, "requests_reorder_result");
		lyre.addCallback(that.genericError, "event_add_result");
		lyre.addCallback(that.genericError, "event_delete_result");
		lyre.addCallback(that.genericError, "event_start_result");
		lyre.addCallback(that.genericError, "event_end_result");
		lyre.addCallback(that.genericError, "oneshot_add_result");
		lyre.addCallback(that.genericError, "oneshot_delete_result");
		lyre.addCallback(that.genericError, "force_candidate_new_result");
		lyre.addCallback(that.genericError, "force_candidate_delete_result");
		lyre.addCallback(that.genericError, "admin_playlist_refresh_result");
		lyre.addCallback(that.genericError, "admin_change_song_multiplier_result");
	};
	
	that.genericError = function(json) {
		if ((typeof(json.code) != "undefined") && json.text) {
			that.doError(json.code, false, false, json.text, 2000);
		}
	};
	
	that.genericR4Result = function(json) {
		// TODO: Use translation keys for error clearing instead of codes
		if (json.code != 1) {
			that.genericR4Error(json);
		}
		else if (json.code == 1) {
			that.doError(json.code, false, "err_div_ok", _l(json.key), 1250);
		}
	};
	
	that.genericR4Error = function(json) {
		if (json.code != 1) {
			that.doError(json.code, false, false, json.text, 2000);
		}
	};
	
	that.lyreError = function(json) {
		if (json.code) {
			var perm = false;
			var text = false;
			if (json.code == 2) perm = true;
			else if (json.code == 403) {
				if (user.p.user_id == 1) text = _l("log_403_anon");
				else text = _l("log_403_reg");
				perm = true;
			}
			that.doError(json.code, perm, false, text);
		}
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
				var x = mouse.x;
				var y = (mouse.y - (UISCALE * 2.5));
				if (y < (UISCALE * 2)) y = UISCALE * 2;
				if (x > (window.innerWidth - errors[code].el.offsetWidth)) x = window.innerWidth - errors[code].el.offsetWidth - 15;
				if (y > (window.innerHeight - errors[code].el.offsetHeight)) y = window.innerHeight - errors[code].el.offsetHeight - 15;
				errors[code].el.style.left = x + "px";
				errors[code].el.style.top = y + "px";
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
	
	that.clearError2 = function(garbage) {
		that.clearError(2);
	};
	
	that.requestnewresult = function(json) {
		if (json.code == 1) {
			that.doError(3500, false, "err_div_ok", _l("requestok"), 1250);
		}
	};
	
	that.voteresult = function(json) {
		if ((typeof(json.code) != "undefined") && (json.code != 700)) {
			that.doError(json.code);
		}
	};
	
	that.rateresult = function(json) {
		if ((typeof(json.code) != "undefined") && (json.code <= 0)) {
			that.doError(7000 + Math.abs(json.code));
		}
	};
	
	that.requestorderresult = function(json) {
		if ((typeof(json.code) != "undefined") && (json.code <= 0)) {
			that.doError(8000 + Math.abs(json.code));
		}
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
