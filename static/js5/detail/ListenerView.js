var ListenerView = function(json) {
	"use strict";
	var template = RWTemplates.detail.listener(json, MOBILE ? null : document.createElement("div"));

	var order = [ 1, 4, 2, 3, 5 ];
	var colors = {
		1: "#1f95e5",  // Rainwave blue (yeah I'm playing favourites)
		2: "#de641b",  // OCR Orange
		3: "#b7000f",  // Red
		4: "#6e439d",  // Indigo
		5: "#a8cb2b",  // greenish
	};
	var chart_width = 200;
	var chart_height = 180;

	var c = template._root.appendChild($el("div", { "style": "text-align: center;" }));
	var d = c.appendChild($el("ul", { "class": "user_detail_legend"}));
	for (var i = 0; i < order.length; i++) {
		d.appendChild($el("li", { "textContent": $l("station_name_" + order[i]), "style": "background-color: " + colors[order[i]] + ";" }));
	}

	var detail_container = template._root.appendChild($el("div", { "class": "user_detail_container" }));

	var current_chart_draw_steps = 40;

	var draw_chart = function(jd, key, header) {
		var data = [];
		var idx, i, sid;
		for (idx in order) {
			sid = order[idx];
			for (i = 0; i < jd.length; i++) {
				if (jd[i].sid == sid) {
					data.push({ "value": jd[i][key], "color": colors[sid], "highlight": "#FFF", "label": $l("station_name_" + sid ) });
				}
			}
		}
		if (data.length > 0) {
			d = detail_container.appendChild($el("div", { "class": "user_detail_segment" }));
			d.appendChild($el("h3", { "textContent": header }));
			var cnvs = d.appendChild($el("canvas", { "width": chart_width, "height": chart_height }));
			new Chart(cnvs.getContext("2d")).Doughnut(data, { "animationSteps": current_chart_draw_steps });
			current_chart_draw_steps += 5;
		}
	};

	draw_chart(json.votes_by_station, "votes", $l("votes_by_station"));
	draw_chart(json.requests_by_station, "requests", $l("requests_by_station"));
	draw_chart(json.votes_by_source_station, "votes", $l("votes_by_source_station"));
	draw_chart(json.requests_by_source_station, "requests", $l("requests_by_source_station"));
	draw_chart(json.ratings_by_station, "ratings", $l("rating_counts_across_stations"));

	var data = [];
	var v, sid, idx, cnvs, chart;
	var total_data = 0;
	for (idx in order) {
		sid = order[idx];
		if (sid == 5) continue;
		data.push({ "value": json.rating_completion[sid] || 0, "color": colors[sid], "highlight": "#FFF", "label": $l("station_name_" + sid ) });
		total_data += json.rating_completion[sid] || 0;
	}
	if (total_data > 5) {
		d = detail_container.appendChild($el("div", { "class": "user_detail_segment" }));
		d.appendChild($el("h3", { "textContent": $l("ratings_completion_rate") }));
		cnvs = d.appendChild($el("canvas", { "width": chart_width, "height": chart_height }));
		chart = new Chart(cnvs.getContext("2d")).PolarArea(data, { "scaleOverride": true, "scaleSteps": 5, "scaleStepWidth": 20, "scaleStartValue": 0, "tooltipTemplate": "<%=label%>: <%= value %>%", "animationSteps": current_chart_draw_steps });
		current_chart_draw_steps += 5;
	}

	data = [];
	var found, any_found;
	for (idx in order) {
		sid = order[idx];
		if (sid == 5) continue;
		found = false;
		for (i = 0; i < json.ratings_by_station.length; i++) {
			if (json.ratings_by_station[i].sid == sid) {
				data.push({ "value": json.ratings_by_station[i].average_rating, "color": colors[sid], "highlight": "#FFF", "label": $l("station_name_" + sid ) });
				found = true;
				any_found = true;
			}
		}
		if (!found) data.push({ "value": 0, "color": colors[sid], "highlight": "#FFF", "label": $l("station_name_" + sid ) });
	}
	if (any_found) {
		d = detail_container.appendChild($el("div", { "class": "user_detail_segment" }));
		d.appendChild($el("h3", { "textContent": $l("average_rating_by_station") }));
		cnvs = d.appendChild($el("canvas", { "width": chart_width, "height": chart_height }));
		chart = new Chart(cnvs.getContext("2d")).PolarArea(data, { "scaleOverride": true, "scaleSteps": 5, "scaleStepWidth": 1, "scaleStartValue": 0, "animationSteps": current_chart_draw_steps });
		current_chart_draw_steps += 5;
	}

	data = [];
	for (v in AlbumViewColors) {
		for (i = 0; i < json.rating_spread.length; i++) {
			if (v == json.rating_spread[i].rating) {
				found = true;
				data.push({ "value": json.rating_spread[i].ratings, "color": AlbumViewColors[v], "highlight": "#FFF", "label": v });
			}
		}
	}
	if (data.length > 0) {
		d = detail_container.appendChild($el("div", { "class": "user_detail_segment" }));
		d.appendChild($el("h3", { "textContent": $l("rating_spread") }));
		cnvs = d.appendChild($el("canvas", { "width": chart_width, "height": chart_height }));
		chart = new Chart(cnvs.getContext("2d")).Doughnut(data, { "animationSteps": current_chart_draw_steps });
		current_chart_draw_steps += 5;
	}

	if (json.user_id == User.id) {
		d = detail_container.appendChild($el("div", { "class": "user_detail_segment" }));
		d.appendChild($el("h3", { "textContent": $l("your_mobile_app_qr") }));
		d.appendChild($el("img", { "width": chart_height - 5, "height": chart_height - 5, "src": "http://chart.apis.google.com/chart?cht=qr&chs=" + (chart_height - 5) + "x" + (chart_height - 5) + "&choe=ISO-8859-1&chl=" + "rw://" + User.id + ":" + User.api_key + "@rainwave.cc" }));
	}

	return template;
};
