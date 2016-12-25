var UnavailableOnThisStationPopup = function() {
	ErrorHandler.tooltip_error({
		"text": $l("song_on_other_station", { "station": $l("station_name_" + User.sid) })
	});
};

var ArtistView = function(json) {
	"use strict";
	var order = [ 1, 4, 2, 3 ];
	var final_order = [ User.sid ];
	for (var i = 0; i < order.length; i++) {
		if (order[i] === User.sid) continue;
		if (!json.all_songs[order[i]]) continue;
		final_order.push(order[i]);
	}
	var albums_sid;
	var albums = [];
	var album_id, a, sid;
	if (!json.albums) {
		// for this to work with songstable we have to restructure all the JSON to look like albums
		for (i = 0; i < final_order.length; i++) {
			sid = final_order[i];
			albums_sid = [];
			for (album_id in json.all_songs[sid]) {
				a = json.all_songs[sid][album_id][0].albums[0];
				a.sid = sid;
				if (sid !== User.sid) {
					a.name = $l("album_on_station", { "station": $l("station_name_" + sid), "album": a.name });
				}
				else {
					a.openable = true;
				}
				// cut off a circular memory reference quick-like
				json.all_songs[sid][album_id][0].albums = null;
				a.songs = json.all_songs[sid][album_id].sort(SongsTableSorting);
				albums_sid.push(a);
			}
			albums_sid.sort(SongsTableAlbumSort);
			albums = albums.concat(albums_sid);
		}
		json.albums = albums;
	}
	var template = RWTemplates.detail.artist({ "artist": json, "albums": json.albums }, !MOBILE ? document.createElement("div") : null);
	var j;
	for (i = 0; i < albums.length; i++) {
		for (j = 0; j < albums[i].songs.length; j++) {
			Fave.register(albums[i].songs[j]);
			Rating.register(albums[i].songs[j]);
			if (albums[i].songs[j].requestable) {
				Requests.make_clickable(albums[i].songs[j].$t.title, albums[i].songs[j].id);
			} else {
				albums[i].songs[j].$t.title.addEventListener("click", UnavailableOnThisStationPopup);
			}
			SongsTableDetail(albums[i].songs[j], ((i == albums.length - 1) && (j > albums[i].songs.length - 4)), albums[i].sid);
		}
	}

	template._header_text = json.name;

	MultiAlbumKeyNav(template, albums);

	return template;
};
