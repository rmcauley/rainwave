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

var SongsTableDetailDraw = function(song, details) {
	// song has the $t from the songs table
	// details contains all the song data
	if (!details) return;
	if (details.rating_rank_percentile >= 50) {
		details.rating_percentile_message = $l("rating_percentile_top", { "rating": details.rating, "percentile": details.rating_rank_percentile, "percentile_top": 100 - details.rating_rank_percentile });
	}
	else {
		details.rating_percentile_message = $l("rating_percentile_bottom", { "rating": details.rating, "percentile": details.rating_rank_percentile });
	}

	if (details.request_rank_percentile >= 50) {
		details.request_percentile_message = $l("request_percentile_top", { "percentile": details.request_rank_percentile, "percentile_top": 100 - details.request_rank_percentile });
	}
	else {
		details.request_percentile_message = $l("request_percentile_bottom", { "percentile": details.request_rank_percentile });
	}

	var template = RWTemplates.detail.song_detail(details, song.$t.row);
	song.$t.details = details.$t.details;

	if (template.graph_placement) {
		var chart = RatingChart(details);
		if (chart) {
			template.graph_placement.parentNode.replaceChild(chart, template.graph_placement);
		}
		template.graph_placement = null;
	}

	Router.recalculate_scroll();
};

var SongsTableDetail = function(song, scroll_on_open, sid) {
	if (!song.$t.detail_icon) {
		return;
	}
	var triggered = false;
	song.$t.detail_icon_click = function(e) {
		if (song.$t.details) {
			if (song.$t.details.parentNode) {
				song.$t.details.parentNode.removeChild(song.$t.details);
			}
			else {
				song.$t.row.appendChild(song.$t.details);
			}
			Router.recalculate_scroll();
			if (scroll_on_open) {
				Router.scroll_a_bit();
			}
		}
		else {
			if (triggered) return;
			triggered = true;
			API.async_get("song", { "id": song.id, "sid": sid }, function(json) {
				SongsTableDetailDraw(song, json.song);
				if (scroll_on_open) {
					Router.scroll_a_bit();
				}
			});
		}
	};
	song.$t.detail_icon.addEventListener("click", song.$t.detail_icon_click);
};

var MultiAlbumKeyNav = function(template, albums) {
	if (Sizing.simple) return;

	var total_songs = 0;
	for (var i = 0; i < albums.length; i++) {
		total_songs += albums[i].songs.length;
	}

	// keyboard nav i, keyboard nav album i
	var kni = false;
	var knai = 0;
	var key_nav_move = function(jump) {
		var step = jump < 0 ? -1 : 1;
		jump = Math.abs(jump);
		var new_i = kni;
		var new_album_i = knai;
		if (kni === false) {
			new_i = 0;
			new_album_i = 0;
		}
		else {
			while (jump !== 0) {
				new_i += step;
				jump--;
				if (new_i == albums[new_album_i].songs.length) {
					new_album_i++;
					if (new_album_i == albums.length) {
						new_album_i = albums.length - 1;
						new_i = albums[new_album_i].songs.length - 1;
						jump = 0;
					}
					else {
						new_i = 0;
					}
				}
				else if (new_i < 0) {
					new_album_i--;
					if (new_album_i < 0) {
						new_album_i = 0;
						new_i = 0;
						jump = 0;
					}
					else {
						new_i = albums[new_album_i].songs.length - 1;
					}
				}
			}
		}
		if ((new_i === kni) && (new_album_i === knai)) return;

		if (kni !== false) {
			albums[knai].songs[kni].$t.row.classList.remove("hover");
		}
		albums[new_album_i].songs[new_i].$t.row.classList.add("hover");

		kni = new_i;
		knai = new_album_i;

		scroll_to_kni();

		return true;
	};

	var scroll_to_kni = function() {
		var kni_y = albums[knai].songs[kni].$t.row.offsetTop;
		var now_y = template._scroll.scroll_top;
		if (kni_y > (now_y + template._scroll.offset_height - 90)) {
			template._scroll.scroll_to(kni_y - template._scroll.offset_height + 90);
		}
		else if (kni_y < (now_y + 60)) {
			template._scroll.scroll_to(kni_y - 60);
		}
	};

	template.key_nav_down = function() { return key_nav_move(1); };
	template.key_nav_up = function() { return key_nav_move(-1); };
	template.key_nav_end = function() { return key_nav_move(total_songs); };
	template.key_nav_home = function() { return key_nav_move(-total_songs); };
	template.key_nav_page_up = function() {
		if (!knai) {
			return false;
		}
		if (kni !== false) {
			albums[knai].songs[kni].$t.row.classList.remove("hover");
		}
		knai = Math.max(0, knai - 1);
		kni = 0;
		albums[knai].songs[kni].$t.row.classList.add("hover");

		scroll_to_kni();
		return true;
	};
	template.key_nav_page_down = function() {
		if (knai == albums.length - 1) {
			return;
		}
		if (kni !== false) {
			albums[knai].songs[kni].$t.row.classList.remove("hover");
		}
		knai = Math.min(albums.length - 1, knai + 1);
		kni = 0;
		albums[knai].songs[kni].$t.row.classList.add("hover");

		scroll_to_kni();
		return true;
	};

	template.key_nav_left = function() { return false; };
	template.key_nav_right = function() { return false; };

	template.key_nav_enter = function() {
		if ((kni !== false) && albums[knai].songs[kni]) {
			Requests.add(albums[knai].songs[kni].id);
			return true;
		}
	};

	template.key_nav_add_character = function(chr) {
		if ((kni !== false) && albums[knai].songs[kni]) {
			if ((chr == "i") && albums[knai].songs[kni].$t.detail_icon_click) {
				albums[knai].songs[kni].$t.detail_icon_click();
			}
			else if ((parseInt(chr) >= 1) && (parseInt(chr) <= 5)) {
				Rating.do_rating(parseInt(chr), albums[knai].songs[kni]);
			}
			else if (chr == "q") Rating.do_rating(1.5, albums[knai].songs[kni]);
			else if (chr == "w") Rating.do_rating(2.5, albums[knai].songs[kni]);
			else if (chr == "e") Rating.do_rating(3.5, albums[knai].songs[kni]);
			else if (chr == "r") Rating.do_rating(4.5, albums[knai].songs[kni]);
			else if ((chr == "f") && (User.id > 1)) {
				var e = document.createEvent("Events");
				e.initEvent("click", true, false);
				albums[knai].songs[kni].$t.fave.dispatchEvent(e);
			}
			return true;
		}
	};
	template.key_nav_backspace = function() { return false; };

	template.key_nav_escape = function() {
		if ((kni !== false) && albums[knai].songs[kni] && albums[knai].songs[kni].$t.detail_icon_click) {
			albums[knai].songs[kni].$t.row.classList.remove("hover");
		}
		kni = false;
		knai = 0;
	};

	template.key_nav_focus = function() {
		if (kni === false) {
			key_nav_move(1);
		}
		else {
			albums[knai].songs[kni].$t.row.classList.add("hover");
		}
	};

	template.key_nav_blur = function() {
		if (kni !== false) {
			albums[knai].songs[kni].$t.row.classList.remove("hover");
		}
	};

	template._key_handle = true;
};
