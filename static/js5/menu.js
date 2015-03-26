var Menu = function() {
	var self = {};
	var songs = {};
	var template;
	var stations = [
		BOOTSTRAP.station_list[5],
		BOOTSTRAP.station_list[1],
		BOOTSTRAP.station_list[4],
		BOOTSTRAP.station_list[2],
		BOOTSTRAP.station_list[3]
	];
	if (window.location.href.indexOf("beta") !== -1) {
		for (var i = 0; i < stations.length; i++) {
			stations.url += "/beta";
		}
	}

	var init = function(dom) {
		API.add_callback(update_tuned_in_status, "user");
		R4Audio.changed_status_callback = update_tuned_in_status_from_player;
		template = RWTemplates.menu({ "stations": stations }).$t;
		dom.insertBefore(template.root, dom.firstChild);

		if (template.settings_link) {
			// TODO: settings link
		}

	};

	var onload = function() {
		var jstz_load = document.createElement("script");
		jstz_load.src = "//cdnjs.cloudflare.com/ajax/libs/jstimezonedetect/1.0.4/jstz.min.js";
		jstz_load.on("click", function() {
			console.log("jstz loaded");
			// template.calendar_menu_item.on("click", calendar_toggle);
			// template.calendar_menu_item.on("mouseout", calendar_hide);
		});
		document.body.appendChild(jstz_load);
	};

	BOOTSTRAP.on_init.push(init);
	BOOTSTRAP.on_draw.push(onload);

	// self.show_modal = function(modal_div) {
	// 	if (current_modal) return;

	// 	modal_div.style.display = "block";
	// 	modal_div.offsetWidth; // force redraw so transitions can happen

	// 	$add_class(modal_div, "active_modal");
	// 	$add_class(document.body, "modal_is_active");

	// 	var kmw = [ 'top_menu_wrapper', 'sizable_body', 'messages' ];
	// 	for (var i = 0; i < kmw.length; i++) {
	// 		$id(kmw[i]).addEventListener('click', self.remove_modal, true);
	// 	}

	// 	current_modal = modal_div;
	// };

	// self.remove_modal = function(e) {
	// 	if (e) {
	// 		e.stopPropagation();
	// 		e.preventDefault();
	// 	}

	// 	Fx.chain_transition(current_modal, function() {
	// 		current_modal.style.display = "none";
	// 		current_modal = null;
	// 	});

	// 	$remove_class(current_modal, "active_modal");
	// 	$remove_class(document.body, "modal_is_active");

	// 	var kmw = [ 'top_menu_wrapper', 'sizable_body', 'messages' ];
	// 	for (var i = 0; i < kmw.length; i++) {
	// 		$id(kmw[i]).removeEventListener('click', self.remove_modal, true);
	// 	}
	// };

	// var calendar_toggle = function(e) {
	// 	var dd = $id("calendar_dropdown"); 
	// 	if (!$has_class(dd, "has_calendar")) {
	// 		var tz_param;
	// 		if (jstz) {
	// 			tz_param = "&ctz=" + jstz.determine().name();
	// 		}
	// 		dd.appendChild($el("iframe", { "class": "calendar_iframe", "src": "https://www.google.com/calendar/embed?showTitle=0&showNav=0&showDate=0&showPrint=0&showCalendars=0&mode=AGENDA&height=500&wkst=1&bgcolor=%23ffffff&src=rainwave.cc_9anf0lu3gsjmgb6k3fcoao894o@group.calendar.google.com&color=%232952A3" + tz_param, "frameborder": "0", "scrolling": "no" }));
	// 		$add_class(dd, "has_calendar");
	// 	}
	// 	if ($has_class(dd, "show_calendar")) {
	// 		$remove_class(dd, "show_calendar");
	// 	}
	// 	else {
	// 		$add_class(dd, "show_calendar");
	// 	}	
	// };

	// var calendar_hide = function(e) {
	// 	if (Mouse.is_mouse_leave(e, $id("calendar_menu_item"))) {
	// 		$remove_class($id("calendar_dropdown"), "show_calendar");
	// 	}
	// };

	// var open_station_select = function(e) {
	// 	Prefs.change("station_select_clicked", true);
	// 	var ss = $id("station_select");
	// 	$remove_class(ss, "call_to_action");
	// 	if (!$has_class(ss, "open")) {
	// 		$add_class($id("top_menu"), "station_select_open");
	// 		$add_class(ss, "open");
	// 		$add_class($id("station_select_container"), "open");
	// 		Fx.chain_transition(ss, function() {
	// 			if ($has_class(ss, "open")) {
	// 				ss.addEventListener("mouseout", close_station_select);
	// 			}
	// 		});
	// 	}
	// 	else {
	// 		close_station_select(null, true);
	// 	}
	// 	remove_event_alert();
	// };

	// var close_station_select = function(e, override) {
	// 	if (override || Mouse.is_mouse_leave(e, $id("station_select"))) {
	// 		$id("station_select").removeEventListener("mouseout", close_station_select);
	// 		Fx.chain_transition($id("station_select"), function() { $remove_class($id("top_menu"), "station_select_open"); });
	// 		$remove_class($id("station_select"), "open");
	// 		$remove_class($id("station_select_container"), "open");
	// 	}
	// };

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

	// 	if (do_event_alert) {
	// 		if (event_alert) {
	// 			remove_event_alert();
	// 		}
	// 		event_alert = $el("div", { "class": "event_ongoing_alert" });
	// 		event_alert.appendChild($el("div", { "textContent": $l("special_event_alert", { "station": $l("station_name_" + event_sid) }) }));
	// 		event_alert.appendChild($el("div", { "textContent": event_desc }));
	// 		$id("station_select_container").parentNode.insertBefore(event_alert, $id("station_select_container").nextSibling);
	// 	}
	// };

	// var audio_playing;
	// var update_tuned_in_status_from_player = function(playing) {
	// 	audio_playing = playing;
	// 	update_tuned_in_status(User);
	// };
	
	// var update_tuned_in_status = function(user_json) {
	// 	if (user_json.tuned_in) {
	// 		$add_class($id("top_menu"), "external_tuned_in");
	// 	}
	// 	else {
	// 		$remove_class($id("top_menu"), "external_tuned_in");
	// 	}
	// };

	return self;
}();