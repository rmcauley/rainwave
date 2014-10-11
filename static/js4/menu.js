var Menu = function() {
	var self = {};
	var elements = {};
	var mobile_height_toggled = false;
	var songs = {};

	var event_alerts_closed = [];
	var event_alert;

	self.initialize = function() {
		Prefs.define("station_select_clicked", [ false, true ]);
	};

	self.draw = function(station_list) {
		API.add_callback(update_tuned_in_status, "user");

		$id("chat_link").textContent = $l("chat");
		$id("forums_link").textContent = $l("forums");
		$id("calendar_link").textContent = $l("events_calendar_link");

		$id("about_link").addEventListener("click", function(e) {
			e.stopPropagation();
			self.show_modal($id("about_window_container"));
		});
		$id("about_modal_header").textContent = $l("about_window_header");

		$id("settings_link").addEventListener("click", function(e) { 
			e.stopPropagation();
			self.show_modal($id("settings_window_container"));
		});
		$id("settings_modal_header").textContent = $l("preferences");

		// // Setup user info
		elements.user_info = $id("user_info");
		if (User.id > 1) {
			if (User.avatar && (User.avatar != "/static/images4/user.svg")) {
				elements.user_info.appendChild($el("img", { "class": "avatar icon", "src": User.avatar }));
			}
			else {
				$add_class(elements.user_info, "show_anonymous_avatar");
			}
			$id("user_info_name").textContent = User.name;
			$id("user_info_name").addEventListener("click", function() { DetailView.open_listener(User.id); });
		}
		else {
			$add_class(elements.user_info, "show_anonymous_avatar anonymous_user");
			$id("user_info_name").setAttribute("href", "http://rainwave.cc/forums/ucp.php?mode=login&redirect=/");
			$id("user_info_name").textContent ="login";
		}

		// Setup station select menu
		var order = [ 5, 1, 4, 2, 3 ];
		$id("station_select_header").textContent = $l("station_select_header");
		var station_container = $id("station_select");
		station_container.addEventListener("click", open_station_select);
		var station;
		var beta_add = window.location.href.indexOf("beta") !== -1 ? "/beta/" : "";
		elements.stations = [];
		for (var i = 0; i < order.length; i++) {
			station = station_container.appendChild($el("a", { "class": "station" }));
			station._station_id = parseInt(order[i]);		// ugh gotta make sure this is a COPY of the integer
			if ((order[i] in station_list) && (order[i] != User.sid)) {
				station.setAttribute("href", station_list[order[i]].url + beta_add);
			}
			if (order[i] === User.sid) {
				$add_class(station, "selected_station");
			}

			station._np_info = station.appendChild($el("div", { "class": "station_song_container" }));

			station._details = station.appendChild($el("div", { "class": "station_details" }));
			station._name = station._details.appendChild($el("div", { "class": "station_name", "textContent": $l("station_name_" + order[i] ) }));
			station._desc = station._details.appendChild($el("div", { "class": "station_description", "textContent": $l("station_menu_description_id_" + order[i]) }));
			elements.stations[station._station_id] = station;
		}
		API.add_callback(update_station_info, "all_stations_info");

		$id("calendar_menu_item").addEventListener("click", calendar_toggle);
		$id("calendar_menu_item").addEventListener("mouseout", calendar_hide);

		$id("about_modal_close").addEventListener("click", self.remove_modal);
		$id("settings_modal_close").addEventListener("click", self.remove_modal);
		$id("longhist_modal_close").addEventListener("click", self.remove_modal);

		if (!Prefs.get("station_select_clicked")) {
			$add_class($id("station_select"), "call_to_action");
		}
	};

	var current_modal;

	self.show_modal = function(modal_div) {
		if (current_modal) return;

		modal_div.style.display = "block";
		modal_div.offsetWidth; // force redraw so transitions can happen

		$add_class(modal_div, "active_modal");
		$add_class(document.body, "modal_is_active");

		var kmw = [ 'top_menu_wrapper', 'sizable_body', 'messages' ];
		for (var i = 0; i < kmw.length; i++) {
			$id(kmw[i]).addEventListener('click', self.remove_modal, true);
		}

		current_modal = modal_div;
	};

	self.remove_modal = function(e) {
		if (e) {
			e.stopPropagation();
			e.preventDefault();
		}

		Fx.chain_transition(current_modal, function() {
			current_modal.style.display = "none";
			current_modal = null;
		});

		$remove_class(current_modal, "active_modal");
		$remove_class(document.body, "modal_is_active");

		var kmw = [ 'top_menu_wrapper', 'sizable_body', 'messages' ];
		for (var i = 0; i < kmw.length; i++) {
			$id(kmw[i]).removeEventListener('click', self.remove_modal, true);
		}
	}

	var calendar_toggle = function(e) {
		var dd = $id("calendar_dropdown"); 
		if (!$has_class(dd, "has_calendar")) {
			dd.appendChild($el("iframe", { "class": "calendar_iframe", "src": "https://www.google.com/calendar/embed?showTitle=0&showNav=0&showDate=0&showPrint=0&showCalendars=0&mode=AGENDA&height=500&wkst=1&bgcolor=%23ffffff&src=rainwave.cc_9anf0lu3gsjmgb6k3fcoao894o@group.calendar.google.com&color=%232952A3", "frameborder": "0", "scrolling": "no" }));
		}
		if ($has_class(dd, "show_calendar")) {
			$remove_class(dd, "show_calendar");
		}
		else {
			$add_class(dd, "show_calendar");
		}	
	};

	var calendar_hide = function(e) {
		var dd = $id("calendar_dropdown"); 
		if (Mouse.is_mouse_leave(e, dd)) {
			$remove_class(dd, "show_calendar");
		}
	};

	var open_station_select = function(e) {
		Prefs.change("station_select_clicked", true);
		$remove_class($id("station_select"), "call_to_action");
		if (!$has_class($id("station_select"), "open")) {
			$add_class($id("station_select"), "open");
			$add_class($id("station_select_container"), "open");
			$id("station_select").addEventListener("mouseout", close_station_select);
		}
		else {
			close_station_select(null, true);
		}
		remove_event_alert();
	};

	var close_station_select = function(e, override) {
		if (override || Mouse.is_mouse_leave(e, $id("station_select"))) {
			$id("station_select").removeEventListener("mouseout", close_station_select);
			$remove_class($id("station_select"), "open");
			$remove_class($id("station_select_container"), "open");
		}
	};

	var update_station_info = function(json) {
		var do_event_alert, event_desc, event_sid;
		for (var key in json) {
			if (json[key] && elements.stations[key]) {
				if (key == 1) {
					json[key].event_name = "10/06 New Music";
					json[key].event_type = "OneUp";
				}
				if (!event_alert && json[key].event_name && (key != User.sid)) {
					event_sid = key;
					$add_class(elements.stations[key], "event_ongoing");
				
					elements.stations[key]._desc.textContent = $l("special_event_on_now");
					event_desc = "";
					if (json[key].event_type == "OneUp") {
						event_desc += json[key].event_name + " " + $l("power_hour");
					}
					else if (json[key].type != "Election" && $l_has(json[key].type.toLowerCase())) {
						event_desc += $l(json[key].type.toLowerCase());
						if (json[key].name) {
							event_desc += " - " + json[key].name;
						}
					}
					else  {
						event_desc += json[key].name;
					}
					elements.stations[key]._desc.textContent += event_desc;

					if (event_alerts_closed.indexOf(json[key].event_name) == -1) {
						do_event_alert = json[key];
					}
				}
				else {
					$remove_class(elements.stations[key], "event_ongoing");
					elements.stations[key]._desc.textContent = $l("station_menu_description_id_" + key);
				}
				
				if (songs[key]) {
					songs[key].el.parentNode.removeChild(songs[key.el]);
				}
				json[key].albums = [ { "art": json[key].art, "name": json[key].album } ];
				songs[key] = TimelineSong.new(json[key]);
				elements.stations[key]._np_info.appendChild(songs[key].el);
			}
		}

		if (do_event_alert) {
			if (event_alert) {
				event_alert.parentNode.removeChild(event_alert);
			}
			event_alert = $el("div", { "class": "event_ongoing_alert" });
			event_alert.appendChild($el("div", { "textContent": $l("special_event_alert", { "station": $l("station_name_" + event_sid) }) }));
			event_alert.appendChild($el("div", { "textContent": event_desc }));
			$id("station_select_container").parentNode.insertBefore(event_alert, $id("station_select_container").nextSibling);
		}
	};

	var remove_event_alert = function() {
		if (event_alert) {
			Fx.chain_transition(event_alert, function(e, el) { el.parentNode.removeChild(el); });
			$add_class(event_alert, "event_alert_closing");
			event_alerts_closed.append(event_alert._name);
			event_alert = null;
		}
	};

	var update_tuned_in_status = function(user_json) {
		if (user_json.tuned_in) {
			$add_class($id("top_menu"), "tuned_in");
		}
		else {
			$remove_class($id("top_menu"), "tuned_in");
		}
	};

	return self;
}();