var SongsTable = function(songs, columns) {
	"use strict";
	var el = $el("table");

	var row, cell;
	for (var i = 0; i < song_data.length; i++) {
		row = $el("tr");
		if (("cool" in song_data[i]) && song_data[i].cool) {
			row.className = "songlist_cool";
		}

		requestable = false;
		if (("origin_sid" in song_data[i]) && (song_data[i].origin_sid == user.p.sid)) requestable = true;
		if (("sid" in song_data[i]) && (song_data[i].sid == user.p.sid)) requestable = true;
		if (("requestable" in song_data[i]) && (song_data[i].requestable)) requestable = true;

		if (requestable) {
			row.appendChild($el("td"), { "class": "songlist_requestable", "textContent": $l("Request") });
			// TODO: make requestable
		}
		else {
			row.appendChild($el("td"), { "class": "songlist_not_requestable" });
		}

		for (var key = 0; key < columns.length; key++) {
			if ((columns[key] == "artists") && ("artist_parseable" in songs[i])) {
				Artists.append_spans_from_string(row.appendChild($el("td", { "class": "songlist_" + columns[key] })), songs[i].artist_parseable);
			}
			else if (columns[key] in songs[i]) {
				if (columns[key] == "rating") {
					row.appendChild($el("td", { "class": "songlist_" + columns[key] }, Rating.new("song", songs[i].id, songs[i].rating_user, songs[i].rating, songs[i].fave, User.radio_rate_anything).el));
				}
				else if (columns[key] == "link" && songs[i].url && songs[i].link_text) {
					row.appendChild($el("td", { "class": "songlist_" + columns[key] }, songlist_Formatting.linkify_external($el("a", { "target": "_blank", "href": songs[i].url, "textContent": songs[i].link_text }))));
				}
				else if (columns[key] == "song_cool_end" && (songs[i].song_cool_end > Clock.now)) {
					row.appendChild($el("td", { "class": "songlist_" + columns[key], "textContent": Formatting.cooldown_glance(songs[i].song_cool_end - Clock.now) } ));
				}
				else if (columns[key] == "length") {
					row.appendChild($el("td", { "class": "songlist_" + columns[key], "textContent": Formatting.minute_clock(songs[i].length) }));
				}
				else {
					row.appendChild($el("td", { "class": "songlist_" + columns[key], "textContent": songs[i][columns[key]] } ));
				}
			}
		}

		el.appendChild(row);
	}

	return el;
};