var Indicator = function(indicator, indicator_start_count, indicator2) {
	"use strict";

	var indicator_timeout;
	var current_count = indicator_start_count;

	var indicate = function(new_count) {
		if (document.body.classList.contains("loading") || (!indicator_timeout && new_count == indicator_start_count)) {
			current_count = new_count;
			indicator_start_count = new_count;
			return;
		}
		if (indicator_timeout) {
			clearTimeout(indicator_timeout);
		}
		current_count = new_count;
		new_count = new_count - indicator_start_count;

		if (new_count > 0) {
			indicator.classList.add("positive");
			indicator.classList.remove("negative");
			indicator.classList.remove("equal");
			indicator.textContent = "+" + new_count;
			if (indicator2) {
				indicator2.textContent = "+" + new_count;
			}
		} else if (new_count < 0) {
			indicator.classList.remove("positive");
			indicator.classList.add("negative");
			indicator.classList.remove("equal");
			indicator.textContent = new_count;
			if (indicator2) {
				indicator2.textContent = new_count;
			}
		} else {
			indicator.textContent = "=";
			indicator.classList.remove("positive");
			indicator.classList.remove("negative");
			indicator.classList.add("equal");
			if (indicator2) {
				indicator2.textContent = "=";
			}
		}
		indicator.classList.add("show");
		if (indicator2) {
			indicator2.classList.add("show");
		}
		indicator_timeout = setTimeout(unindicate, 2000);
	};

	var unindicate = function() {
		indicator.classList.remove("show");
		if (indicator2) {
			indicator2.classList.remove("show");
		}
		indicator_timeout = setTimeout(blank_indicator, 300);
		indicator_start_count = current_count;
	};

	var blank_indicator = function() {
		indicator_timeout = null;
		indicator.textContent = "";
		if (indicator2) {
			indicator2.textContent = "";
		}
	};

	return indicate;
};
