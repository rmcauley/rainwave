// var AlbumViewRatingBarChart = function(ctx, json) {
// 	"use strict";
// 	var labels = [ "1.0", "1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "4.5", "5.0" ];
// 	var dataset = [];
// 	for (var i = 0; i < labels.length; i++) {
// 		dataset.push(json.rating_histogram[labels[i]] || Math.round(Math.random() * 100));
// 	}
// 	var data = {
// 	    labels: labels,
// 	    datasets: [
// 	        {
// 	            fillColor: "rgba(31,149,229,0.5)",
// 	            strokeColor: "rgba(31,149,229,0.8)",
// 	            highlightFill: "rgba(31,149,229,0.75)",
// 	            highlightStroke: "rgba(31,149,229,1)",
// 	            data: dataset
// 	        }
// 	    ]
// 	};
// 	var chart = new Chart(ctx).Bar(data, { "barValueSpacing": 3 });
// // };	Chart.defaults.global.showScale = false;
// 	Chart.defaults.global.scaleShowLabels = false;
// 	Chart.defaults.global.scaleLineColor = "rgba(255,255,255,.3)";
// 	Chart.defaults.global.scaleBeginAtZero = true;

var AlbumViewRatingPieChart = function(ctx, json) {
	"use strict";
	var data = [];
	var colors = { "1.0": "#bf3334",
					"1.5": "#bf3334",
					"2.0": "#a04655",
					"2.5": "#a04655",
					"3.0": "#6f648b",
					"3.5": "#6f648b",
					"4.0": "#497bb6",
					"4.5": "#497bb6",
					"5.0": "#1f95e4"
				};
	for (var i in colors) {
		if (i in json.rating_histogram) data.push({ "value": json.rating_histogram[i], "color": colors[i], "highlight": "#FFF", "label": i });
	}
	if (data.length == 0) return;
	var chart = new Chart(ctx).Doughnut(data, { "segmentStrokeWidth": 1 });
};

var AlbumView = function(view, json) {
	"use strict";
	view.el.appendChild(Albums.art_html(json));
	var i;

	var d = $el("div", { "class": "albumview_header" });
	d.appendChild($el("h1", { "textContent": json.name }));

	var cnvs = d.appendChild($el("canvas", { "width": 100, "height": 80 }));
	//d.appendChild($el("div", { "class": "canvas_header", "textContent": $l("ratings_detail") }));
	AlbumViewRatingPieChart(cnvs.getContext("2d"), json);

	if (json.rating > 0) {
		d.appendChild($el("div", { "class": "albumview_info", "textContent": $l("album_rating_ranked_at", { "rating": json.rating, "rank": json.rating_rank }) }));
	}
	if (json.request_count > 0) {
		d.appendChild($el("div", { "class": "albumview_info", "textContent": $l("album_requests_ranked_at", { "count": json.request_count, "rank": json.request_rank }) }));
	}
	view.el.appendChild(d);

	if (User.sid == 5) {
		var s = {};
		for (i = 0; i < json.songs.length; i++) {
			if (!s[json.songs[i].origin_sid]) s[json.songs[i].origin_sid] = [];
			s[json.songs[i].origin_sid].push(json.songs[i]);
		}
		for (i in s) {
			view.el.appendChild($el("h2", { "textContent": $l("songs_from", { "station": $l("station_name_" + i) }) }));
			view.el.appendChild(SongsTable(s[i], [ "title", "artists", "length", "rating", "cool_end" ]));
		}
	}
	else {
		view.el.appendChild(SongsTable(json.songs, [ "title", "artists", "length", "rating", "cool_end" ]));
	}
	return view.el;
};