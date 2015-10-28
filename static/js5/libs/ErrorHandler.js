(function() {
	"use strict";
	var self = {};
	var container;
	var permanent_errors = {};

	var onerror_handler = function(message, url, lineNo, charNo, exception) {
		var template = Modal($l("oops"), "modal_error", null, true);
		template.content.parentNode.classList.add("error");

		try {
			var submit_obj = {
				"name": exception.name,
				"message": exception.message,
				"lineNumber": exception.lineNumber || "(no line)",
				"columnNumber": exception.columnNumber ||  "(no char number)",
				"stack": exception.stack || exception.backtrace || exception.stacktrace || "(no stack)",
				"location": window.location.href,
				"user_agent": navigator.userAgent,
				"browser_language": navigator.language || navigator.userLanguage,
			};
			API.async_get("error_report", submit_obj);
		}
		catch (e) {
			// don't complain, we've already crashed
		}
	};

	BOOTSTRAP.on_init.push(function(template) {
		API.add_callback("station_offline", self.permanent_error);
		container = template.messages;
	});

	self.make_error = function(tl_key, code) {
		return { "tl_key": tl_key, "code": code, "text": $l(tl_key) };
	};

	self.permanent_error = function(json, append_element) {
		if (!(json.tl_key in permanent_errors)) {
			RWTemplates.error_bar(json);
			json.$t.close_button.addEventListener("click", function() { self.remove_permanent_error(json.tl_key); });
			if (append_element) json.$t.el.appendChild(append_element);
			container.appendChild(json.$t.el);
			permanent_errors[json.tl_key] = json;
		}
	};

	self.remove_permanent_error = function(tl_key) {
		if (tl_key in permanent_errors) {
			Fx.remove_element(permanent_errors[tl_key].$t.el);
			delete(permanent_errors[tl_key]);
		}
	};

	self.tooltip_error = function(json) {
		if (!json) return;
		if (MOBILE) {
			self.permanent_error(json);
			setTimeout(function() { self.remove_permanent_error(json.tl_key); }, 5000);
		}
		else {
			var err = document.createElement("div");
			err.className = "error_tooltip";
			err.textContent = json.text;

			var x = Mouse.x - 5;
			var y = Mouse.y - 40 - 2;
			if (y < 20) y = 30;
			else if (y > (Sizing.height - 40)) y = Sizing.height - 40;
			if (x < 30) x = 40;
			else if (x > (Sizing.width - 40)) x = Sizing.width - 40;
			err.style.left = x + "px";
			err.style.top = y + "px";

			document.body.appendChild(err);
			requestAnimationFrame(function() { err.style.opacity = "1"; });
			setTimeout(function() { Fx.remove_element(err); }, 5000);
		}
	};

	window.onerror = onerror_handler;
	window.ErrorHandler = self;

	return self;
})();
