var GroupView = function(view, json) {
	"use strict";
	var h1 = document.createElement("h1");
	h1.textContent = json.name;
	view.el.appendChild(h1);

	var all_tables = [];
	var subheader, link;
	for (var album_id in json.all_songs_for_sid) {
		subheader = document.createElement("h2");
		subheader.textContent = json.all_songs_for_sid[album_id][0].albums[0].name;
		if (json.all_songs_for_sid[album_id][0].albums[0].openable) {
			link = document.createElement("a");
			link.setAttribute("href", "#!/album/" + json.all_songs_for_sid[album_id][0].albums[0].id);
			link.appendChild(subheader);
			subheader = link;
		}
		var name = json.all_songs_for_sid[album_id][0].albums[0].name;
		if (SITE_CONFIG.use_years_in_sort && json.all_songs_for_sid[album_id][0].albums[0].year) {
			name = json.all_songs_for_sid[album_id][0].albums[0].year + " - " + name;
		}
		all_tables.push({
			"table": SongsTable(json.all_songs_for_sid[album_id], SITE_CONFIG.album_view_columns),
			"name": name,
			"header": subheader
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

	return view.el;
};
