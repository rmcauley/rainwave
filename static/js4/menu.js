var Menu = function() {
	var self = {};
	var elements = {};
	var songs = {};
	var mobile_height_toggled = false;

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
		for (var i = 0; i < order.length; i++) {
			station = station_container.appendChild($el("a", { "class": "station" }));
			station._station_id = parseInt(order[i]);		// ugh gotta make sure this is a COPY of the integer
			if ((order[i] in station_list) && (order[i] != User.sid)) {
				station.setAttribute("href", station_list[order[i]].url + beta_add);
			}
			if (order[i] === User.sid) {
				$add_class(station, "selected_station");
			}

			station._details = station.appendChild($el("div", { "class": "station_details" }));
			station._name = station._details.appendChild($el("div", { "class": "station_name", "textContent": $l("station_name_" + order[i] ) }));
			station._desc = station._details.appendChild($el("div", { "class": "station_description", "textContent": $l("station_menu_description_id_" + order[i]) }));

			station._song = station.appendChild($el("div", { "class": "station_song" }));
			station._title = station._song.appendChild($el("div", { "class": "station_song_title" }));
			station._album = station._song.appendChild($el("div", { "class": "station_song_album" }));
		}
		API.add_callback(update_station_info, "all_stations_info");

		$id("calendar_menu_item").addEventListener("mouseover", insert_calendar_iframe);

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

	var insert_calendar_iframe = function(e) {
		$id("calendar_menu_item").removeEventListener("mouseover", insert_calendar_iframe);

		$id("calendar_dropdown").appendChild($el("iframe", { "class": "calendar_iframe", "src": "https://www.google.com/calendar/embed?showTitle=0&showNav=0&showDate=0&showPrint=0&showCalendars=0&mode=AGENDA&height=500&wkst=1&bgcolor=%23ffffff&src=rainwave.cc_9anf0lu3gsjmgb6k3fcoao894o@group.calendar.google.com&color=%232952A3", "frameborder": "0", "scrolling": "no" }));
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
	};

	var close_station_select = function(e, override) {
		if (override || Mouse.is_mouse_leave(e, $id("station_select"))) {
			$id("station_select").removeEventListener("mouseout", close_station_select);
			$remove_class($id("station_select"), "open");
			$remove_class($id("station_select_container"), "open");
		}
	};

	var show_station_info = function(e) {
		// var sid = this._station_id || e.target._station_id || e.target.parentNode._station_id;
		// if (!sid || !songs[sid]) return;
		// if (songs[sid]._shown) return;
		// songs[sid]._shown = true;

		// if (elements[sid].firstChild.nextSibling.className == "timeline_song") {
		// 	elements[sid].replaceChild(songs[sid].el, elements[sid].firstChild.nextSibling);
		// }
		// else {
		// 	elements[sid].insertBefore(songs[sid].el, elements[sid].firstChild.nextSibling);
		// }
	};

	var update_station_info = function(json) {
		// for (var key in json) {
		// 	if (json[key]) {
		// 		json[key].albums = [ { "art": json[key].art, "name": json[key].album } ];
		// 		songs[key] = TimelineSong.new(json[key]);
		// 		songs[key]._shown = false;
		// 	}
		// }
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