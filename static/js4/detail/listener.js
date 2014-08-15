var ListenerView = function(view, json) {
	"use strict";
	view.el.appendChild(Albums.art_html({ "secret_user_sauce": json.avatar }));
	var d = $el("div", { "class": "albumview_header" });
	d.appendChild($el("h1", { "textContent": json.name }));
	view.el.appendChild(d);

	var order = [ 1, 4, 2, 3, 5 ];
	var colors = {
		1: "#1f95e5",  // Rainwave blue (yeah I'm playing favourites)
		2: "#f9bf22",  // OCR Orange
		3: "#b91fe5",  // Purple
		4: "#5ad9e8",  // Cyan
		5: "#1fe53b",  // green
	};
	var chart_width = 300;
	var chart_height = 200;

	var c = view.el.appendChild($el("div", { "style": "text-align: center;" }));
	d = c.appendChild($el("ul", { "class": "user_detail_legend"}));
	for (var i = 0; i < order.length; i++) {
		d.appendChild($el("li", { "textContent": $l("station_name_" + order[i]), "style": "background-color: " + colors[order[i]] + ";" }));
	}

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
			d = view.el.appendChild($el("div", { "class": "user_detail_segment" }));
			d.appendChild($el("h3", { "textContent": header }));
			var cnvs = d.appendChild($el("canvas", { "width": chart_width, "height": chart_height }));
			var chart = new Chart(cnvs.getContext("2d")).Doughnut(data);
		}
	};

	draw_chart(json.votes_by_station, "votes", $l("votes_by_station"));
	draw_chart(json.requests_by_station, "requests", $l("requests_by_station"));
	draw_chart(json.votes_by_source_station, "votes", $l("votes_by_source_station"));
	draw_chart(json.requests_by_source_station, "requests", $l("requests_by_source_station"));
	draw_chart(json.ratings_by_station, "ratings", $l("rating_counts_across_stations"));

	var data = [];
	var v, sid, idx;
	var total_data = 0;
	for (idx in colors) {
		sid = colors[idx];
		if (sid == 5) continue;
		data.push({ "value": json.rating_completion[sid] || 0, "color": colors[sid], "highlight": "#FFF", "label": $l("station_name_" + sid ) });
		total_data += json.rating_completion[sid] || 0;
	}
	if (total_data > 5) {
		d = view.el.appendChild($el("div", { "class": "user_detail_segment" }));
		d.appendChild($el("h3", { "textContent": $l("ratings_completion_rate") }));
		var cnvs = d.appendChild($el("canvas", { "width": chart_width, "height": chart_height }));
		var chart = new Chart(cnvs.getContext("2d")).PolarArea(data, { "scaleOverride": true, "scaleSteps": 5, "scaleStepWidth": 20, "scaleStartValue": 0, "tooltipTemplate": "<%=label%>: <%= value %>%" });
	}

	var data = [];
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
		d = view.el.appendChild($el("div", { "class": "user_detail_segment" }));
		d.appendChild($el("h3", { "textContent": $l("average_rating_by_station") }));
		var cnvs = d.appendChild($el("canvas", { "width": chart_width, "height": chart_height }));
		var chart = new Chart(cnvs.getContext("2d")).PolarArea(data, { "scaleOverride": true, "scaleSteps": 5, "scaleStepWidth": 1, "scaleStartValue": 0 });
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
		d = view.el.appendChild($el("div", { "class": "user_detail_segment" }));
		d.appendChild($el("h3", { "textContent": $l("rating_spread") }));
		var cnvs = d.appendChild($el("canvas", { "width": chart_width, "height": chart_height }));
		var chart = new Chart(cnvs.getContext("2d")).Doughnut(data);
	}	

	return view.el;
};