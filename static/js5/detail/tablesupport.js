// this special sorting fixes how Postgres ignores spaces while sorting
// the discrepency in sorting is small, but does exist, since
// many other places on the page do sorting.
var SongsTableAlbumSort = function(a, b) {
	// if (a.year && b.year) {
	// 	if (a.year < b.year) return -1;
	// 	else if (a.year > b.year) return 1;
	// }
	if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
	else if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
	return 0;
};

var SongsTableSorting = function(a, b) {
	"use strict";
	if (a.title.toLowerCase() < b.title.toLowerCase()) return -1;
	else if (a.title.toLowerCase() > b.title.toLowerCase()) return 1;
	return 0;
};

// TODO: bring back song details
	// if (title_cell) {
	// 	title_cell._song_id = songs[i].id;
	// 	title_cell.addEventListener("click", function(e) {
	// 		var el = this;
	// 		if (el.triggered) return;
	// 		el.triggered = true;
	// 		API.async_get("song", { "id": el._song_id }, function(json) {
	// 			SongsTableDetailDraw(el, json);
	// 		});
	// 	});
	// }