var ArtistView = function(view, json) {
	"use strict";
	var d = $el("div", { "class": "albumview_header" });
	d.appendChild($el("h1", { "textContent": json.name }));
	view.el.appendChild(d);
	var temp_album = [];
	var current_album_id = json.songs[0].albums[0].id;
	for (var i = 0; i < json.songs.length; i++) {
		if (current_album_id != json.songs[i].albums[0].id) {
			var subheader = $el("div", { "class": "albumview_subheader", "textContent": json.songs[i - 1].albums[0].name });
			if (json.songs[i - 1].sid == User.sid) {
				subheader.className += " link";
				subheader._album_id = current_album_id;
				subheader.addEventListener("click", function(e) { DetailView.open_album(e.target._album_id); });
			}
			view.el.appendChild(subheader);
			view.el.appendChild(SongsTable(temp_album, [ "title", "length", "rating", "cool_end" ]));
			current_album_id = json.songs[i].albums[0].id;
			temp_album = [];
		}
		temp_album.push(json.songs[i]);
	}
	if (temp_album.length > 0) {
		view.el.appendChild($el("div", { "class": "albumview_subheader", "textContent": json.songs[i - 1].albums[0].name }));
		view.el.appendChild(SongsTable(temp_album, [ "title", "length", "rating", "cool_end" ]));
	}
	
	return view.el;
};