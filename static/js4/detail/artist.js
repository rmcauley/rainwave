var ArtistViewRenderSid = function(view, json, sid) {
	"use strict";
	var all_tables = [];
	var subheader;
	for (var album_id in json) {
		subheader = $el("h2", { "class": "artistview_subheader", "textContent": $l("album_on_station", { "station": $l("station_name_" + sid), "album": json[album_id][0].albums[0].name }) });
		if (json[album_id][0].albums[0].openable) {
			subheader.className += " link";
			subheader._album_id = json[album_id][0].albums[0].id;
			subheader.addEventListener("click", function(e) { DetailView.open_album(e.target._album_id); });
		}
		all_tables.push( {
			"table": SongsTable(json[album_id], [ "title", "length", "rating", "cool_end" ]),
			"header": subheader,
			"name": json[album_id][0].albums[0].name
		});
	}

	all_tables.sort(function(a, b) {
		if (a.name < b.name) return -1;
		else if (a.name > b.name) return 1;
		return 0;
	});

	for (var i = 0; i < all_tables.length; i++) {
		view.el.appendChild(all_tables[i].header);
		view.el.appendChild(all_tables[i].table);
	}
};

var ArtistView = function(view, json) {
	"use strict";
	view.el.appendChild($el("h1", { "textContent": json.name }));

	if (json.all_songs[User.sid]) ArtistViewRenderSid(view, json.all_songs[User.sid], User.sid);

	var i, sid, album_id;
	var order = [ 1, 4, 2, 3 ];
	for (i in order) {
		sid = order[i];
		if (sid == User.sid) continue;
		if (json.all_songs[sid]) ArtistViewRenderSid(view, json.all_songs[sid], sid);
	}

	return view.el;
};