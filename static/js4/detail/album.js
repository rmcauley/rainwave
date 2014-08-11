var AlbumView = function(view, json) {
	"use strict";
	view.el.appendChild(Albums.art_html(json));
	var d = $el("div", { "class": "albumview_header" });
	d.appendChild($el("h1", { "textContent": json.name }));
	if (json.rating > 0) {
		d.appendChild($el("div", { "class": "albumview_info", "textContent": $l("album_rating_ranked_at", { "rating": json.rating, "rank": json.rating_rank }) }));
	}
	if (json.request_count > 0) {
		d.appendChild($el("div", { "class": "albumview_info", "textContent": $l("album_requests_ranked_at", { "count": json.request_count, "rank": json.request_rank }) }));
	}
	view.el.appendChild(d);
	if (User.sid == 5) {
		var s = {};
		for (var i = 0; i < json.songs.length; i++) {
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