var AlbumView = function(view, json) {
	"use strict";
	view.el.appendChild(SongsTable(json.songs, [ "title", "artists", "link", "length", "cooldown", "rating" ]));
	return view.el;
};