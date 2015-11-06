var Menu = function() {
	"use strict";

	var self = {};
	var template;
	var has_calendar;

	BOOTSTRAP.on_init.push(function(root_template) {
		template = root_template;

		// must be done in JS, if you try to do it in the template you still get a clickable <a>
		for (var i = 0; i < Stations.length; i++) {
			if (Stations[i].url) {
				Stations[i].$t.menu_link.setAttribute("href", Stations[i].url);
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

		if (User.avatar == "/static/images4/user.svg") {
			template.header.classList.add("no_avatar");
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

		if (template.calendar_dropdown) {
			BOOTSTRAP.on_draw.push(function() {
				var jstz_load = document.createElement("script");
				jstz_load.src = "//cdnjs.cloudflare.com/ajax/libs/jstimezonedetect/1.0.4/jstz.min.js";
				jstz_load.addEventListener("load", function() {
					template.calendar_menu_item.addEventListener("click", calendar_toggle);
					template.menu_wrapper.addEventListener("mouseleave", calendar_hide);
				});
				document.body.appendChild(jstz_load);
			});

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

	var open_station_select = function(e) {
		if (!template.station_select.classList.contains("open")) {
			template.hamburger_container.classList.remove("burger_open");
			template.station_select.classList.add("open");
			template.station_select.classList.remove("closed");
			template.station_select_header.addEventListener("click", close_station_select);
			template.header.addEventListener("mouseleave", close_station_select);
			e.stopPropagation();
		}
	};

	var close_station_select = function(e) {
		if (template.station_select.classList.contains("open")) {
			template.station_select.classList.remove("open");
			template.station_select.classList.add("closed");
			template.station_select_header.removeEventListener("click", close_station_select);
			template.header.removeEventListener("mouseleave", close_station_select);
			e.stopPropagation();
		}
	};

	// var update_station_info = function(json) {
	// 	var do_event_alert, event_desc, event_sid;
	// 	for (var key in json) {
	// 		if (json[key] && elements.stations[key]) {
	// 			if (!event_alert && json[key].event_name && (key != User.sid)) {
	// 				event_sid = key;
	// 				$add_class(elements.stations[key], "event_ongoing");

	// 				elements.stations[key]._desc.textContent = $l("special_event_on_now");
	// 				event_desc = Formatting.event_name(json[key].event_type, json[key].event_name);
	// 				elements.stations[key]._desc.textContent += event_desc;

	// 				if (event_alerts_closed.indexOf(json[key].event_name) == -1) {
	// 					do_event_alert = json[key];
	// 				}
	// 			}
	// 			else if (!json[key].event_name) {
	// 				remove_event_alert();
	// 				$remove_class(elements.stations[key], "event_ongoing");
	// 				elements.stations[key]._desc.textContent = $l("station_menu_description_id_" + key);
	// 			}

	// 			if (songs[key]) {
	// 				songs[key].el.parentNode.removeChild(songs[key].el);
	// 			}
	// 			json[key].albums = [ { "art": json[key].art, "name": json[key].album } ];
	// 			songs[key] = TimelineSong.create(json[key]);
	// 			elements.stations[key]._np_info.appendChild(songs[key].el);
	// 		}
	// 	}

	return self;
}();
