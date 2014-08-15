var GroupView = function(view, json) {
	"use strict";
	view.el.appendChild($el("h1", { "textContent": json.name }));

	var all_tables = [];
	var subheader, o;
	for (var album_id in json.all_songs_for_sid) {
		subheader = $el("h2", { "class": "artistview_subheader", "textContent": json.all_songs_for_sid[album_id][0].albums[0].name });
		if (json.all_songs_for_sid[album_id][0].albums[0].openable) {
			subheader.className += " link";
			subheader._album_id = json.all_songs_for_sid[album_id][0].albums[0].id;
			subheader.addEventListener("click", function(e) { DetailView.open_album(e.target._album_id); });
		}
		all_tables.push({
			"table": SongsTable(json.all_songs_for_sid[album_id], [ "title", "length", "rating", "cool_end" ]),
			"name": json.all_songs_for_sid[album_id][0].albums[0].name,
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