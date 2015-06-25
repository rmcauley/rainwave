var ArtistView = function(view, json) {
	"use strict";
	var order = [ 1, 4, 2, 3 ];
	var final_order = [ User.sid ];
	for (var i in order) {
		if (order[i] === User.sid) continue;
		final_order.push(order[i]);
	}
	var albums_sid;
	var albums = [];
	var album_id, a;
	for (var sid in final_order) {
		albums_sid = [];
		for (album_id in json.all_songs[sid]) {
			a = json.all_songs[sid][album_id][0].albums[0];
			if (sid !== User.sid) {
				a.name = $l("album_on_station", { "station": $l("station_name_" + sid), "album": a.name });
			}
			// cut off a circular memory reference quick-like
			json.all_songs[sid][album_id][0].albums = null;
			a.songs = json.all_songs[sid][album_id].sort(SongsTableSorting);
			for (i = 0; i < a.songs.length; i++) {
				a.songs[i].artists = JSON.parse(a.songs[i].artists_parseable);
			}
			albums.push(a);
		}
		albums_sid.sort(SongsTableAlbumSort);
		albums = albums.concat(albums_sid);
	}
	view.el.appendChild(RWTemplates.playlist.artist_detail({ "artist": json, "albums": albums }));

	return view.el;
};
