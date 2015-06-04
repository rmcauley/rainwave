var ArtistViewRenderSid = function(view, json, sid) {
	"use strict";
	var all_tables = [];

	var subheader, link;
	for (var album_id in json) {
		subheader = document.createElement("h2");
		subheader.textContent = $l("album_on_station", { "station": $l("station_name_" + sid), "album": json[album_id][0].albums[0].name });
		if (json[album_id][0].albums[0].openable) {
			link = document.createElement("a");
			link.setAttribute("href", "#!/album/" + json[album_id][0].albums[0].id);
			link.appendChild(subheader);
			subheader = link;
		}
		var name = json[album_id][0].albums[0].name;
		if (SITE_CONFIG.use_years_in_sort && json[album_id][0].albums[0].year) {
			name = json[album_id][0].albums[0].year + " - " + name;
		}
		all_tables.push( {
			"table": SongsTable(json[album_id], SITE_CONFIG.artist_view_columns),
			"header": subheader,
			"name": name
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
	var h1 = document.createElement("h1");
	h1.textContent = json.name;

	if (json.all_songs[User.sid]) ArtistViewRenderSid(view, json.all_songs[User.sid], User.sid);

	var i, sid;
	var order = [ 1, 4, 2, 3 ];
	for (i in order) {
		sid = order[i];
		if (sid == User.sid) continue;
		if (json.all_songs[sid]) ArtistViewRenderSid(view, json.all_songs[sid], sid);
	}

	return view.el;
};
