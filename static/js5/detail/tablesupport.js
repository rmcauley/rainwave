// this special sorting fixes how Postgres ignores spaces while sorting
// the discrepency in sorting is small, but does exist, since
// many other places on the page do sorting.
var SongsTableAlbumSort = function(a, b) {
	// if (a.year && b.year) {
	// 	if (a.year < b.year) return -1;
	// 	else if (a.year > b.year) return 1;
	// }
	if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
	else if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
	return 0;
};

var SongsTableSorting = function(a, b) {
	"use strict";
	if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
	else if (a.title.toLowerCase() > b.title.toLowerCase()) return 1;
	return 0;
};

var SongsTableDetailDraw = function(song, details) {
	// song has the $t from the songs table
	// details contains all the song data
	if (details.rating_rank_percentile >= 50) {
		details.rating_percentile_message = $l("rating_percentile_top", { "rating": details.rating, "percentile": details.rating_rank_percentile, "percentile_top": 100 - details.rating_rank_percentile });
	}
	else {
		details.rating_percentile_message = $l("rating_percentile_bottom", { "rating": details.rating, "percentile": details.rating_rank_percentile });
	}

	if (details.request_rank_percentile >= 50) {
		details.request_percentile_message = $l("request_percentile_top", { "percentile": details.request_rank_percentile, "percentile_top": 100 - details.request_rank_percentile });
	}
	else {
		details.request_percentile_message = $l("request_percentile_bottom", { "percentile": details.request_rank_percentile });
	}

	var template = RWTemplates.detail.song_detail(details, song.$t.row);

	if (template.graph_placement) {
		var chart = RatingChart(details);
		if (chart) {
			template.graph_placement.parentNode.replaceChild(chart, template.graph_placement);
		}
		template.graph_placement = null;
	}
};

var SongsTableDetail = function(song) {
	if (!song.$t.detail_icon) {
		return;
	}
	var triggered = false;
	song.$t.detail_icon.addEventListener("click", function(e) {
		if (triggered) return;
		triggered = true;
		API.async_get("song", { "id": song.id }, function(json) {
			SongsTableDetailDraw(song, json);
		});
	});
};
