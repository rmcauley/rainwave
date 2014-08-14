var ArtistViewRenderSid = function(view, json, sid) {
	"use strict";
	for (var album_id in json) {
		var subheader = $el("h2", { "class": "artistview_subheader", "textContent": $l("album_on_station", { "station": $l("station_name_" + sid), "album": json[album_id][0].albums[0].name }) });
		if (json[album_id][0].albums[0].openable) {
			subheader.className += " link";
			subheader._album_id = json[album_id][0].albums[0].id;
			subheader.addEventListener("click", function(e) { DetailView.open_album(e.target._album_id); });
		}
		view.el.appendChild(subheader);
		view.el.appendChild(SongsTable(json[album_id], [ "title", "length", "rating", "cool_end" ]));
	}
}

var ArtistView = function(view, json) {
	"use strict";
	view.el.appendChild($el("h1", { "textContent": json.name }));
	
	if (json.all_songs[User.sid]) ArtistViewRenderSid(view, json.all_songs[User.sid], User.sid);

	var sid, album_id;
	for (sid in json.all_songs) {
		if (sid == User.sid) continue;
		ArtistViewRenderSid(view, json.all_songs[sid], sid);
	}
	
	return view.el;
};