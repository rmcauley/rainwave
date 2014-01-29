var AlbumView = function(view, json) {
	"use strict";
	var d = $el("div", { "class": "albumview_header" });
	d.appendChild(Albums.art_html(json, 120));
	d.appendChild($el("h1", { "textContent": json.name }));
	if (json.rating > 0) {
		d.appendChild($el("div", { "class": "albumview_info", "textContent": $l("album_rating_ranked_at", { "rating": json.rating, "rank": json.rating_rank }) }));
	}
	if (json.request_count > 0) {
		d.appendChild($el("div", { "class": "albumview_info", "textContent": $l("album_requests_ranked_at", { "count": json.request_count, "rank": json.request_rank }) }));
	}
	view.el.appendChild(d);
	view.el.appendChild(SongsTable(json.songs, [ "title", "artists", "length", "cooldown", "rating" ]));
	return view.el;
};