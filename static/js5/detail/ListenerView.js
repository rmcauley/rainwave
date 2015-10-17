var ListenerView = function(json, el) {
	"use strict";

	// nobody cares about timezones
	json.regdate = new Date(json.regdate).getYear() + 1900;
	var template = RWTemplates.detail.listener(json, document.createElement("div"));
	template._header_text = json.name;
	el.appendChild(template._root);

	var current_chart_draw_steps = 40;
	var detail_container = template.user_detail_container;

	var segment_context = {
		"chart_width": 130,
		"chart_height": 100,
	};

	var draw_chart = function(jd, key, header) {
		var data = [];
		var i, j, sid;
		for (j = 0; j < Stations.length; j++) {
			sid = Stations[j].id;
			for (i = 0; i < jd.length; i++) {
				if (jd[i].sid == sid) {
					data.push({ "value": jd[i][key], "color": Stations[j].color, "highlight": "#FFF", "label": Stations[i].name });
					break;
				}
			}
		}
		if (data.length > 0) {
			segment_context.header = header;
			RWTemplates.detail.listener_chart(segment_context, detail_container);
			new Chart(segment_context.$t.canvas.getContext("2d")).Doughnut(data, { "animationSteps": current_chart_draw_steps });
			current_chart_draw_steps += 5;
		}
	};

	draw_chart(json.votes_by_station, "votes", $l("votes_by_station"));
	draw_chart(json.requests_by_station, "requests", $l("requests_by_station"));
	draw_chart(json.votes_by_source_station, "votes", $l("votes_by_source_station"));
	draw_chart(json.requests_by_source_station, "requests", $l("requests_by_source_station"));
	draw_chart(json.ratings_by_station, "ratings", $l("rating_counts_across_stations"));

	var data = [];
	var v, sid, chart, i, j;
	var total_data = 0;
	for (i = 0; i < Stations.length; i++) {
		sid = Stations[i].id;
		if (sid == 5) continue;
		data.push({ "value": json.rating_completion[sid] || 0, "color": Stations[i].color, "highlight": "#FFF", "label": Stations[i].name });
		total_data += json.rating_completion[sid] || 0;
	}
	if (total_data > 5) {
		segment_context.header = $l("ratings_completion_rate");
		RWTemplates.detail.listener_chart(segment_context, detail_container);
		chart = new Chart(segment_context.$t.canvas.getContext("2d")).PolarArea(data, { "scaleOverride": true, "scaleSteps": 5, "scaleStepWidth": 20, "scaleStartValue": 0, "tooltipTemplate": "<%=label%>: <%= value %>%", "animationSteps": current_chart_draw_steps });
		current_chart_draw_steps += 5;
	}

	data = [];
	var found, any_found;
	for (i = 0; i < Stations.length; i++) {
		sid = Stations[i].id;
		if (sid == 5) continue;
		found = false;
		for (j = 0; j < json.ratings_by_station.length; j++) {
			if (json.ratings_by_station[j].sid == sid) {
				data.push({ "value": json.ratings_by_station[j].average_rating, "color": Stations[i].color, "highlight": "#FFF", "label": Stations[i].name });
				found = true;
				any_found = true;
			}
		}
		if (!found) data.push({ "value": 0, "color": Stations[i].color, "highlight": "#FFF", "label": Stations[i].name });
	}
	if (any_found) {
		segment_context.header = $l("average_rating_by_station");
		RWTemplates.detail.listener_chart(segment_context, detail_container);
		chart = new Chart(segment_context.$t.canvas.getContext("2d")).PolarArea(data, { "scaleOverride": true, "scaleSteps": 5, "scaleStepWidth": 1, "scaleStartValue": 0, "animationSteps": current_chart_draw_steps });
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
		segment_context.header = $l("rating_spread");
		RWTemplates.detail.listener_chart(segment_context, detail_container);
		chart = new Chart(segment_context.$t.canvas.getContext("2d")).Doughnut(data, { "animationSteps": current_chart_draw_steps });
		current_chart_draw_steps += 5;
	}

	if (json.user_id == User.id) {
		RWTemplates.detail.listener_qr(segment_context, detail_container);
	}

	return template;
};
