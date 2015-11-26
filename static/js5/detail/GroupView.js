var GroupView = function(json) {
	"use strict";
	var template;
	if (!json.$t) {
		var albums = [];
		var a, album_id, i;
		var total_songs = 0;
		for (album_id in json.all_songs_for_sid) {
			a = json.all_songs_for_sid[album_id][0].albums[0];
			// cut off a circular memory reference quick-like
			json.all_songs_for_sid[album_id][0].albums = null;
			a.songs = json.all_songs_for_sid[album_id].sort(SongsTableSorting);
			total_songs += a.songs.length;
			for (i = 0; i < a.songs.length; i++) {
				a.songs[i].artists = JSON.parse(a.songs[i].artist_parseable);
			}
			albums.push(a);
		}
		albums.sort(SongsTableAlbumSort);

		template = RWTemplates.detail.group({ "group": json, "albums": albums }, MOBILE ? null : document.createElement("div"));

		var j;
		for (i = 0; i < albums.length; i++) {
			for (j = 0; j < albums[i].songs.length; j++) {
				Fave.register(albums[i].songs[j]);
				Rating.register(albums[i].songs[j]);
				if (albums[i].songs[j].requestable) {
					Requests.make_clickable(albums[i].songs[j].$t.title, albums[i].songs[j].id);
				}
			}
		}

		template._header_text = json.name;

		if (!Sizing.simple) {
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
						if (new_i == albums[new_album_i].length) {
							new_album_i++;
							if (new_album_i == albums.length) {
								new_album_i = albums.length = 1;
								new_i = albums[new_album_i].length - 1;
								jump = 0;
							}
						}
						else if (new_i < 0) {
							new_album_i--;
							if (new_album_i < 0) {
								new_album_i = 0;
								new_i = 0;
								jump = 0;
							}
						}
					}
				}
				if ((new_i === kni) && (new_album_i === knai)) return;

				albums[knai].songs[kni].$t.row.classList.remove("hover");
				albums[new_album_i].songs[new_i].$t.row.classList.add("hover");

				kni = new_i;
				knai = new_album_i;

				scroll_to_kni();
			};

			var scroll_to_kni = function() {
				var kni_y = albums[knai].songs[kni].offsetTop;
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
			template.key_nav_end = function() { key_nav_move(total_songs); };
			template.key_nav_home = function() { key_nav_move(-total_songs); };
			template.key_nav_page_down = function() {
				if (!knai) {
					return;
				}
				albums[knai].songs[kni].$t.row.classList.remove("hover");
				knai--;
				kni = 0;
				albums[knai].songs[kni].$t.row.classList.add("hover");

				scroll_to_kni();
			};
			template.key_nav_page_up = function() {
				if (knai == albums.length - 1) {
					return;
				}
				albums[knai].songs[kni].$t.row.classList.remove("hover");
				knai++;
				kni = 0;
				albums[knai].songs[kni].$t.row.classList.add("hover");

				scroll_to_kni();
			};

			template.key_nav_left = function() { return false; };
			template.key_nav_right = function() { return false; };

			template.key_nav_enter = function() {
				if ((kni !== false) && albums[knai].songs[kni] && albums[knai].songs[kni].$t.detail_icon_click) {
					albums[knai].songs[kni].$t.detail_icon_click();
				}
			};

			template.key_nav_add_character = function() { return false; };
			template.key_nav_backspace = function() { return false; };

			template.key_nav_escape = function() {
				if ((kni !== false) && albums[knai].songs[kni] && albums[knai].songs[kni].$t.detail_icon_click) {
					albums[knai].songs[kni].$t.row.classList.remove("hover");
				}
				kni = false;
				knai = 0;
			};
		}
	}

	return template;
};
