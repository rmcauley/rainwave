var GroupView = function(json) {
	"use strict";
	var template;
	if (!json.$t) {
		var albums = [];
		var a, album_id, i;
		for (album_id in json.all_songs_for_sid) {
			a = json.all_songs_for_sid[album_id][0].albums[0];
			// cut off a circular memory reference quick-like
			json.all_songs_for_sid[album_id][0].albums = null;
			a.songs = json.all_songs_for_sid[album_id].sort(SongsTableSorting);
			for (i = 0; i < a.songs.length; i++) {
				a.songs[i].artists = JSON.parse(a.songs[i].artist_parseable);
			}
			albums.push(a);
		}
		albums.sort(SongsTableAlbumSort);

		template = RWTemplates.detail.group({ "group": json, "albums": albums }, MOBILE ? null : document.createElement("div"));

		var j;
		for (i = 0; i < albums.length; i++) {
			for (j = 0; j < albums[i].songs.length; j++) {
				Fave.register(albums[i].songs[j]);
				Rating.register(albums[i].songs[j]);
				if (albums[i].songs[j].requestable) {
					Requests.make_clickable(albums[i].songs[j].$t.title, albums[i].songs[j].id);
				}
				if (!Sizing.simple) {
					SongsTableDetail(albums[i].songs[j]);
				}
			}
		}

		template._header_text = json.name;

		MultiAlbumKeyNav(template, albums);
	}

	return template;
};
