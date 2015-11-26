var RatingColors = {
	"1.0": "#11537f",
	"1.5": "#206898",
	"2.0": "#2873a7",
	"2.5": "#3281b7",
	"3.0": "#3789c1",
	"3.5": "#3789c1",
	"4.0": "#459cd7",
	"4.5": "#4ca6e3",
	"5.0": "#55b3f3"
};

var RatingChart = function(json) {
	var data = [];
	for (var i in RatingColors) {
		if (i in json.rating_histogram) {
			data.push({
				"value": json.rating_histogram[i],
				"color": RatingColors[i],
				"label": i,
				"tooltip": Formatting.rating(i) + ": " + json.rating_histogram[i]
			});
		}
	}
	if (data.length === 0) return;
	var c = HDivChart(data, { "min_share": 4, "add_share_to_tooltip": true });
	c.classList.add("chart_ratings");
	return c;
};

var AlbumView = function(album) {
	"use strict";

	album.num_song_ratings = 0;
	for (var i in RatingColors) {
		if (i in album.rating_histogram) {
			album.num_song_ratings += album.rating_histogram[i];
		}
	}

	album.songs.sort(SongsTableSorting);

	album.is_new = album.added_on > (Clock.now - (86400 * 14));
	album.is_newish = album.added_on > (Clock.now - (86400 * 30));

	album.has_new = false;
	album.has_newish = false;
	for (i = 0; i < album.songs.length; i++) {
		if (album.songs[i].added_on > (Clock.now - (86400 * 14))) {
			album.songs[i].is_new = true;
			album.has_new = true;
		}
		else if (album.songs[i].added_on > (Clock.now - (86400 * 30))) {
			album.songs[i].is_newish = true;
			album.has_newish = true;
		}
		else {
			album.songs[i].is_new = false;
		}
	}

	// there are some instances of old songs breaking out into new albums
	// correct for that here
	album.is_new = album.has_new && album.is_new;
	album.is_newish = album.has_newish && album.is_newish;

	album.new_indicator = false;
	if (album.is_new) {
		album.new_indicator = $l("new_album");
		album.new_indicator_class = "new_indicator";
	}
	else if (album.is_newish) {
		album.new_indicator = $l("newish_album");
		album.new_indicator_class = "newish_indicator";
	}
	else if (album.has_new) {
		album.new_indicator = $l("new_songs");
		album.new_indicator_class = "new_indicator";
	}
	else if (album.has_newish) {
		album.new_indicator = $l("newish_songs");
		album.new_indicator_class = "newish_indicator";
	}

	if (album.rating_rank_percentile >= 50) {
		album.rating_percentile_message = $l("rating_percentile_top", { "rating": album.rating, "percentile": album.rating_rank_percentile, "percentile_top": 100 - album.rating_rank_percentile });
	}
	else {
		album.rating_percentile_message = $l("rating_percentile_bottom", { "rating": album.rating, "percentile": album.rating_rank_percentile });
	}

	if (album.request_rank_percentile >= 50) {
		album.request_percentile_message = $l("request_percentile_top", { "percentile": album.request_rank_percentile, "percentile_top": 100 - album.request_rank_percentile });
	}
	else {
		album.request_percentile_message = $l("request_percentile_bottom", { "percentile": album.request_rank_percentile });
	}

	var template = RWTemplates.detail.album(album, !MOBILE ? document.createElement("div") : null);
	AlbumArt(album.art, template.art);

	if (template.category_rollover) {
		template.category_list.parentNode.removeChild(template.category_list);
		template.category_rollover.parentNode.addEventListener("mouseenter", function() {
			template.category_rollover.parentNode.appendChild(template.category_list);
		});
		template.category_rollover.parentNode.addEventListener("mouseleave", function() {
			template.category_list.parentNode.removeChild(template.category_list);
		});
	}

	if (template.graph_placement) {
		var chart = RatingChart(album);
		if (chart) {
			template.graph_placement.parentNode.replaceChild(chart, template.graph_placement);
		}
		template.graph_placement = null;
	}

	for (i = 0; i < album.songs.length; i++) {
		if (!album.songs[i].artists) {
			album.songs[i].artists = JSON.parse(album.songs[i].artist_parseable);
		}
	}
	if (User.sid == 5) {
		var songs = {};
		for (i = 0; i < album.songs.length; i++) {
			if (!songs[album.songs[i].origin_sid]) {
				songs[album.songs[i].origin_sid] = [];
			}
			songs[album.songs[i].origin_sid].push(album.songs[i]);
		}
		for (i in songs) {
			var h2 = document.createElement("h2");
			h2.textContent = $l("songs_from", { "station": $l("station_name_" + i) });
			template._root.appendChild(h2);
			template._root.appendChild(RWTemplates.detail.songtable({ "songs": songs[i] })._root);
		}
	}
	else {
		template._root.appendChild(RWTemplates.detail.songtable({ "songs": album.songs })._root);
	}

	// Rating.register(album);
	// Fave.register(album, true);

	for (i = 0; i < album.songs.length; i++) {
		Fave.register(album.songs[i]);
		Rating.register(album.songs[i]);
		if (album.songs[i].requestable) {
			Requests.make_clickable(album.songs[i].$t.title, album.songs[i].id);
		}
		if (!Sizing.simple) {
			SongsTableDetail(album.songs[i]);
		}
	}

	template._header_text = album.name;

	if (!Sizing.simple) {
		// keyboard nav i
		var kni = false;
		var key_nav_move = function(jump) {
			var new_i = kni === false ? Math.max(0, -1 + jump) : Math.min(album.songs.length - 1, Math.max(0, kni + jump));
			if (new_i === kni) return;

			if (kni !== false) {
				album.songs[kni].$t.row.classList.remove("hover");
			}
			album.songs[new_i].$t.row.classList.add("hover");
			kni = new_i;
			scroll_to_kni();
		};

		var scroll_to_kni = function() {
			var kni_y = album.songs[kni].offsetTop;
			var now_y = template._scroll.scroll_top;
			if (kni_y > (now_y + scroll.offset_height - 60)) {
				scroll.scroll_to(kni_y - scroll.offset_height + 60);
			}
			else if (kni_y < (now_y + 60)) {
				scroll.scroll_to(kni_y - 60);
			}
		};

		template.key_nav_down = function() { key_nav_move(1); };
		template.key_nav_up = function() { key_nav_move(-1); };
		template.key_nav_page_down = function() { key_nav_move(15); };
		template.key_nav_page_up = function() { key_nav_move(-15); };
		template.key_nav_end = function() { key_nav_move(album.songs.length); };
		template.key_nav_home = function() { key_nav_move(-album.songs.length); };

		template.key_nav_left = function() { return false; };
		template.key_nav_right = function() { return false; };

		template.key_nav_enter = function() {
			if ((kni !== false) && album.songs[kni] && album.songs[kni].$t.detail_icon_click) {
				album.songs[kni].$t.detail_icon_click();
			}
		};

		template.key_nav_add_character = function() { return false; };
		template.key_nav_backspace = function() { return false; };

		template.key_nav_escape = function() {
			if ((kni !== false) && album.songs[kni] && album.songs[kni].$t.detail_icon_click) {
				album.songs[kni].$t.row.classList.remove("hover");
			}
			kni = false;
		};

		template.key_nav_focus = function() {
			if (kni === false) {
				key_nav_move(1);
			}
			else {
				album.songs[kni].$t.row.classList.add("hover");
			}
		};

		template.key_nav_blur = function() {
			if (kni !== false) {
				album.songs[kni].$t.row.classList.remove("hover");
			}
		};

		template._key_handle = true;
	}

	return template;
};
