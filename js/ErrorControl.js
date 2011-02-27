function ErrorControl() {
	var that = {};
	var errors = {};
	var showx = 0;
	var showy = 0;
	var timers = {};
	var showing = {};
	
	that.initTheme = function() {
		theme.Extend.ErrorControl(that);
	};
	
	that.changeShowXY = function(x, y) {
		showx = x;
		showy = y;
	};
	
	that.setupCallbacks = function() {
		ajax.addCallback(that, that.lyreError, "error");
		ajax.addCallback(that, that.clearError2, "user");
		ajax.addCallback(that, that.requestnewresult, "request_result");
		ajax.addCallback(that, that.voteresult, "vote_result");
		ajax.addCallback(that, that.rateresult, "rate_result");
		ajax.addCallback(that, that.requestorderresult, "requests_reorder_result");
		ajax.addCallback(that, that.genericError, "event_add_result");
		ajax.addCallback(that, that.genericError, "event_delete_result");
		ajax.addCallback(that, that.genericError, "event_start_result");
		ajax.addCallback(that, that.genericError, "event_end_result");
		ajax.addCallback(that, that.genericError, "oneshot_add_result");
		ajax.addCallback(that, that.genericError, "oneshot_delete_result");
		ajax.addCallback(that, that.genericError, "force_candidate_new_result");
		ajax.addCallback(that, that.genericError, "force_candidate_delete_result");
		ajax.addCallback(that, that.loginresult, "login_result")
		ajax.addCallback(that, that.genericError, "admin_playlist_refresh_result");
		//ajax.addCallback(that, that.newsCallback, "news");
		//user.addCallback(that, that.statRestrict, "radio_statrestricted");
	};
	
	that.genericError = function(json) {
		if ((typeof(json.code) != "undefined") && json.text) {
			that.doError(json.code, false, false, json.text, 2000);
		}
	}
	
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
				//that.startTracking(code, overridetime);
			}
			
			if (!permanent || (permanent !== true)) {
				errors[code].el.addEventListener('click', function() { that.clearError(code); }, false);
				errors[code].el.style.cursor = 'pointer';
			}
			
			if (!permanent) {
				var x = mouse.x;
				var y = (mouse.y - (svg.em * 2.5));
				if (y < (svg.em * 2)) y = svg.em * 2;
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
			ry += errors[code].el.offsetHeight + (svg.em / 2);
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
		document.getElementById("body").removeChild(error.el);
	};
	
	that.clearError2 = function(garbage) {
		that.clearError(2);
	};
	
	that.requestnewresult = function(json) {
		if ((typeof(json.code) != "undefined") && (json.code <= 0)) {
			that.doError(3000 + Math.abs(json.code));
		}
		else if ((typeof(json.code) != "undefined") && (json.code == 1)) {
			that.doError(3500, false, "err_div_ok", _l("requestok"), 1250);
		}
	};
	
	that.voteresult = function(json) {
		if ((typeof(json.code) != "undefined") && (json.code <= 0)) {
			that.doError(2000 + Math.abs(json.code));
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
	
	that.loginresult = function(json) {
		if ((typeof(json.code) != "undefined") && (json.code == -2)) {
			that.doError(9002, false, false, json.text);
		}
		else if ((typeof(json.code) != "undefined") && (json.code <= 0)) {
			that.doError(9000 + Math.abs(json.code));
		}
		else if (json.code && (json.code == 1)) {
			that.clearError(9000);
			that.clearError(9001);
			that.clearError(9002);
		}
	};
	
	that.newsCallback = function(json) {
		if (json.length) {
			for (var i = 0; i < json.length; i++) {
				that.doError(10000 + i, 1, false, json[i].topic_title);
			}
		}
	};
	
	that.statRestrict = function(restricted) {
		if (restricted) {
			that.doError(3, true, _l("log_3", { "lockedto": STATIONS[user.p.radio_active_sid], "currentlyon": STATIONS[user.p.sid] }));
		}
	};

	return that;
};