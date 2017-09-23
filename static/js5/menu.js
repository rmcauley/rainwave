var Menu = function() {
	"use strict";

	var self = {};
	var template;
	var has_calendar;

	var open_station = function(e) {
		if (RWAudio && RWAudio.isPlaying && !MOBILE) {
			e.stopPropagation();
			e.preventDefault();
			window.location.href = this._href + "#!/autoplay";
			return false;
		}
	};

	BOOTSTRAP.on_init.push(function(root_template) {
		template = root_template;

		// must be done in JS, if you try to do it in the template you still get a clickable <a> for
		// the station that shouldn't have a link
		for (var i = 0; i < Stations.length; i++) {
			if (Stations[i].url) {
				Stations[i].$t.menu_link.setAttribute("href", Stations[i].url);
				Stations[i].$t.menu_link._href = Stations[i].url;
				Stations[i].$t.menu_link.addEventListener("click", open_station);
			}
			else {
				Stations[i].$t.menu_link.classList.add("selected_station");
				if (Stations.length > 1) {
					template.station_select_header.addEventListener("click", toggle_station_select);
					template.station_select.classList.add("openable");
					Stations[i].$t.menu_link.addEventListener("mousedown", open_station_select);
					Stations[i].$t.menu_link.addEventListener("touchstart", open_station_select);
				}
				root_template.pulldown.addEventListener("click", toggle_station_select);
			}
		}

		if (template.settings_link) {
			template.settings_link.addEventListener("click", SettingsWindow);
		}

		template.playlist_link.addEventListener("click", function() {
			if (document.body.classList.contains("playlist")) {
				Router.change();
			}
			else {
				Router.open_last();
			}
		});

		template.burger_button.addEventListener("click", function() {
			template.hamburger_container.classList.toggle("burger_open");
		});

		var close_burger = function() {
			template.hamburger_container.classList.remove("burger_open");
		};

		template.menu_wrapper.addEventListener("mouseleave", close_burger);
		template.request_link.addEventListener("click", close_burger);
		template.playlist_link.addEventListener("click", close_burger);
		template.player.addEventListener("click", close_burger);

		if (template.user_link) {
			template.user_link.addEventListener("click", close_burger);
		}

		if (template.calendar_dropdown) {
			var calendar_toggle = function(e) {
				if (!has_calendar) {
					var tz_param;
					if (jstz) {
						tz_param = "&ctz=" + jstz.determine().name();
					}
					var iframe = document.createElement("iframe");
					iframe.setAttribute("src", "https://www.google.com/calendar/embed?showTitle=0&showNav=0&showDate=0&showPrint=0&showCalendars=0&mode=AGENDA&height=500&wkst=1&bgcolor=%23ffffff&src=rainwave.cc_9anf0lu3gsjmgb6k3fcoao894o@group.calendar.google.com&color=%232952A3" + tz_param);
					iframe.setAttribute("frameborder", 0);
					template.calendar_dropdown.appendChild(iframe);
					has_calendar = true;
				}
				if (template.calendar_dropdown.classList.contains("show_calendar")) {
					calendar_hide();
				}
				else {
					template.calendar_dropdown.classList.add("show_calendar");
				}
			};

			var calendar_hide = function(e) {
				template.calendar_dropdown.classList.remove("show_calendar");
			};

			template.calendar_menu_item.addEventListener("click", calendar_toggle);
			template.menu_wrapper.addEventListener("mouseleave", calendar_hide);
		}

		if (!MOBILE) {
			API.add_callback("all_stations_info", update_station_info);
		}
	});

	var toggle_station_select = function(e) {
		if (template.station_select.classList.contains("open")) {
			close_station_select(e);
		}
		else {
			open_station_select(e);
		}
	};

	var stop_propagation = function(e) {
		e.stopPropagation();
	};

	var open_station_select = function(e) {
		if (!template.station_select.classList.contains("open")) {
			template.hamburger_container.classList.remove("burger_open");
			template.station_select.classList.add("open");
			template.station_select.classList.remove("closed");
			template.station_select_header.addEventListener("click", close_station_select);
			template.header.addEventListener("mouseleave", close_station_select);

			template.station_select.addEventListener("touchstart", stop_propagation);
			document.body.addEventListener("touchstart", close_station_select);

			e.stopPropagation();
		}
	};

	var close_station_select = function(e) {
		if (template.station_select.classList.contains("open")) {
			template.station_select.classList.remove("open");
			template.station_select.classList.add("closed");
			template.station_select_header.removeEventListener("click", close_station_select);
			template.header.removeEventListener("mouseleave", close_station_select);

			template.station_select.removeEventListener("touchstart", stop_propagation);
			document.body.removeEventListener("touchstart", close_station_select);

			e.stopPropagation();
		}
	};

	var update_station_info = function(json) {
		var i, key;
		for (key in json) {
			if (!json[key]) {
				continue;
			}

			for (i = 0; i < Stations.length; i++) {
				if ((Stations[i].id == key) && Stations[i].$t.menu_np_art) {
					Stations[i].$t.menu_np_art.style.backgroundImage = "url(" + json[key].art + "_120.jpg)";
					Stations[i].$t.menu_np_song.textContent = json[key].title;
					Stations[i].$t.menu_np_album.textContent = json[key].album;
				}
			}
		}
	};

	return self;
}();
