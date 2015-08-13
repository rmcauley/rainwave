var GroupView = function(el, json) {
	"use strict";
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

	var template = RWTemplates.detail.group({ "group": json, "albums": albums }, MOBILE ? null : document.createElement("div"));
	template._header_Text = json.name;
	return template;
};
