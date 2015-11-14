var AlbumViewColors = {
	"1.0": "#FF6801",
	"1.5": "#F79450",
	"2.0": "#F2B084",
	"2.5": "#EDCDB7",
	"3.0": "#E8E8E8",
	"3.5": "#B4D6ED",
	"4.0": "#7FC3F2",
	"4.5": "#4CB1F7",
	"5.0": "#0197FF"
};

var AlbumViewRatingPieChart = function(ctx, album) {
	"use strict";

	var data = [];
	for (var i in AlbumViewColors) {
		if (i in album.rating_histogram) data.push({ "value": Math.round(album.rating_histogram[i] / album.num_song_ratings * 100), "color": AlbumViewColors[i], "highlight": "#FFF", "label": i });
	}
	if (data.length === 0) return;
	new Chart(ctx).Doughnut(data, { "segmentStrokeWidth": 1, "animationSteps": 40, "tooltipTemplate": "<%if (label){%><%=label%>: <%}%><%= value %>%", });
};

var AlbumView = function(album) {
	"use strict";

	album.num_song_ratings = 0;
	for (var i in AlbumViewColors) {
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

	var template = RWTemplates.detail.album(album, !MOBILE ? document.createElement("div") : null);
	AlbumArt(album.art, template.art);

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

	Rating.register(album);
	Fave.register(album);

	for (i = 0; i < album.songs.length; i++) {
		Fave.register(album.songs[i]);
		Rating.register(album.songs[i]);
		if (album.songs[i].requestable) {
			Requests.make_clickable(album.songs[i].$t.title, album.songs[i].id);
		}
	}

	if (template.rating_graph) AlbumViewRatingPieChart(template.rating_graph.getContext("2d"), album);

	template._header_text = album.name;

	return template;
};
