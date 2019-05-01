function HDivChart(data, options) {
	"use strict";

	options = options || {};
	options.min_share = options.min_share || 0;

	var total, i;
	if (options.max) {
		total = options.max;
	} else {
		total = 0;
		for (i = 0; i < data.length; i++) {
			total += data[i].value;
		}
	}

	var total_percent = 0;
	for (i = 0; i < data.length; i++) {
		data[i].share = Math.floor((data[i].value / total) * 100);
		data[i].share_accurate = Math.round((data[i].value / total) * 100);
		total_percent += data[i].share;
	}

	if (data.length > 1) {
		for (i = 0; i < data.length && total_percent < 100; i++) {
			data[i].share += 1;
			total_percent += 1;
		}
	}

	if (options.add_share_to_label) {
		for (i = 0; i < data.length; i++) {
			data[i].label += data[i].share + "%";
		}
	}

	if (options.add_share_to_tooltip) {
		for (i = 0; i < data.length; i++) {
			data[i].tooltip += " (" + data[i].share_accurate + "%)";
		}
	}

	var outside = document.createElement("div");
	outside.className = "chart_outside";
	var d, t, pos;
	pos = 0;
	for (i = 0; i < data.length; i++) {
		d = document.createElement("div");
		d.className = "chart_bar";
		d.style.width = data[i].share + "%";
		d.style.backgroundColor = data[i].color;
		d.style.left = pos + "%";
		if (data[i].label && data[i].share >= options.min_share && (!options.guide_lines || data.length !== 1)) {
			t = document.createElement("span");
			t.className = "chart_label";
			t.textContent = data[i].label;
			d.appendChild(t);
		}
		if (data[i].tooltip) {
			t = document.createElement("span");
			if (pos <= 15) {
				t.className = "chart_tooltip chart_tooltip_left";
			} else if (pos >= 85) {
				t.className = "chart_tooltip chart_tooltip_right";
			} else {
				t.className = "chart_tooltip";
			}
			t.textContent = data[i].tooltip;
			d.appendChild(t);
		}
		pos += data[i].share;
		outside.appendChild(d);
	}

	if (options.guide_lines) {
		for (i = 1; i < options.guide_lines; i++) {
			d = document.createElement("div");
			d.className = "chart_pip";
			d.style.left = Math.round(100 / options.guide_lines) * i + "%";
			outside.appendChild(d);
		}

		if (data.length === 1) {
			t = document.createElement("span");
			t.className = "chart_label";
			t.textContent = data[0].label;
			outside.appendChild(t);
		}
	}

	return outside;
}
