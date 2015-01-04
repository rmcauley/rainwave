var SongsTable = function(songs, columns) {
	"use strict";
	var el = $el("table", { "class": "songlist" });

	var row, cell, cell2, cell3, r, i, div, div2, link, title_el, title_cell;
	for (i = 0; i < songs.length; i++) {
		row = $el("tr");
		if (("cool" in songs[i]) && songs[i].cool) {
			row.className = "songlist_cool";
		}

		var requestable = false;
		if (("origin_sid" in songs[i]) && (songs[i].origin_sid == User.sid)) requestable = true;
		if (("sid" in songs[i]) && (songs[i].sid == User.sid)) requestable = true;
		if (("requestable" in songs[i]) && (songs[i].requestable)) requestable = true;

		if (requestable && (User.id > 1)) {
			cell = $el("td", { "class": "songlist_requestable" });
			cell.appendChild($el("img", { "src": "/static/images4/request.png" }));
			if (!Prefs.get("request_made")) {
				cell.appendChild($el("span", { "textContent": $l("Request") }));
				cell.addEventListener("click", function() {
					Prefs.change("request_made", true);
				});
			}
			row.appendChild(cell);
			Requests.make_clickable(cell, songs[i].id);

		}
		else {
			row.appendChild($el("td", { "class": "songlist_not_requestable" }));
		}

		if (songs[i].url) {
			link = $el("a", { "href": songs[i].url, "target": "_blank" });
			link.appendChild($el("img", { "src": "/static/images4/link_external.svg", "class": "link_external" }));
			cell = $el("td", { "class": "songlist_url" });
			cell.appendChild(link);
			row.appendChild(cell);
		}
		else {
			row.appendChild($el("td", { "class": "songlist_url" }));
		}

		title_el = null;
		title_cell = null;
		for (var key = 0; key < columns.length; key++) {
			if ((columns[key] == "artists") && ("artist_parseable" in songs[i])) {
				cell = row.appendChild($el("td", { "class": "songlist_" + columns[key] }));
				div = $el("div", { "class": "songlist_" + columns[key] + "_text" });
				Artists.append_spans_from_json(div, JSON.parse(songs[i].artist_parseable));
				//Formatting.add_overflow_tooltip(div);
				cell.appendChild(div);
			}
			else if (columns[key] in songs[i]) {
				if (columns[key] == "title" || columns[key] == "album_name") {
					cell = row.appendChild($el("td", { "class": "songlist_" + columns[key] } ));
					div = $el("div", { "class": "songlist_" + columns[key] + "_text", "textContent": songs[i][columns[key]] });
					title_el = div;
					title_cell = cell;
					//Formatting.add_overflow_tooltip(div);
					cell.appendChild(div);
				}
				else if (columns[key] == "rating") {
					if (Prefs.get("detail_global_ratings")) {
						cell2 = $el("td", { "class": "songlist_rating_user_number" });
						cell3 = $el("td", { "class": "songlist_rating_number" });
					}
					else {
						cell2 = null;
						cell3 = null;
					}

					cell = $el("td", { "class": "songlist_" + columns[key] });
					r = Rating("song", songs[i].id, songs[i].rating_user, songs[i].rating, songs[i].fave, User.rate_anything, title_el, true, cell3, cell2);
					r.absolute_x = true;
					r.absolute_y = true;
					cell.appendChild(r.el);
					row.appendChild(cell);

					if (cell2) row.appendChild(cell2);
					if (cell3) row.appendChild(cell3);

					// I didn't like the way this fit into the design, despite it being a user requested feature. (it was not clamored for)
					// if (User.id > 1) {
					// 	cell = $el("td", { "class": "songlist_rating_clear" });
					// 	div = $el("span", { "style": "float: right;", "textContent": "X" });
					// 	div._song_id = songs[i].id;
					// 	div.addEventListener("click", function(e) {
					// 		if (e.target._song_id) API.async_get("clear_rating", { "song_id": e.target._song_id });
							
					// 	})
					// 	cell.appendChild(div);
					// 	row.appendChild(cell);
					// }
				}
				else if (columns[key] == "cool_end") {
					if (songs[i].cool_end > Clock.now) {
						row.appendChild($el("td", { "class": "songlist_" + columns[key], "textContent": Formatting.cooldown_glance(songs[i].cool_end - Clock.now) } ));
					}
					else {
						row.appendChild($el("td", { "class": "songlist_" + columns[key] }));
					}
				}
				else if (columns[key] == "length") {
					row.appendChild($el("td", { "class": "songlist_" + columns[key], "textContent": Formatting.minute_clock(songs[i].length) }));
				}
				else if (columns[key] == "song_played_at") {
					row.appendChild($el("td", { "class": "songlist_cool_end", "textContent": Formatting.cooldown_glance(Clock.now - songs[i][columns[key]]) } ));
				}
				else if ((columns[key] == "track_number") || (columns[key] == "disc_number")) {
					if (Prefs.get("show_"+columns[key])) {
						if (songs[i][columns[key]]) {
							row.appendChild($el("td", { "class": "songlist_"+columns[key], "textContent": songs[i][columns[key]] + "." } ));
						}
						else {
							row.appendChild($el("td", { "class": "songlist_"+columns[key] } ));
						}
					}
				}
				else {
					row.appendChild($el("td", { "class": "songlist_" + columns[key], "textContent": songs[i][columns[key]] } ));
				}
			}

			if (title_cell) {
				title_cell._song_id = songs[i].id;
				title_cell.addEventListener("click", function(e) {
					var el = this;
					if (el.triggered) return;
					el.triggered = true;
					API.async_get("song", { "id": el._song_id }, function(json) {
						SongsTableDetailDraw(el, json);
					});
				});
			}
		}

		el.appendChild(row);
	}
	return el;
};

var SongsTableDetailDraw = function(title_el, json) {
	if (title_el.childNodes.length > 1) return;
	var d = $el("div", { "class": "songlist_extra_detail" });
	var cnvs = d.appendChild($el("canvas", { "width": 100, "height": 80 }));
	AlbumViewRatingPieChart(cnvs.getContext("2d"), json.song);
	title_el.insertBefore(d, title_el.firstChild);
};
