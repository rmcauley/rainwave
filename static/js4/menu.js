var Menu = function() {
	var self = {};
	var elements = {};
	var songs = {};
	var mobile_height_toggled = false;

	self.initialize = function() {
		Prefs.define("small_menu");
		Prefs.add_callback("small_menu", function(val) {
			solve_menu_size(val);
			SCREEN_HEIGHT = false;
			_on_resize();
		});
		solve_menu_size(Prefs.get("small_menu"));
	};

	var solve_menu_size = function(val) {
		if (val && !MOBILE) {
			MENU_HEIGHT = 25;
			Fx.delay_draw(function() { $add_class($id("top_menu"), "small_menu") });
			Fx.delay_draw(function() { $remove_class($id("top_menu"), "normal_menu") });
		}
		else {
			MENU_HEIGHT = 56;
			Fx.delay_draw(function() { $remove_class($id("top_menu"), "small_menu") });
			Fx.delay_draw(function() { $add_class($id("top_menu"), "normal_menu") });
		}
	};

	var remove_about_window = function(e) {
		if (Mouse.is_mouse_leave(e, $id("logo"))) {
			$id("about_window").className = "hidden_info info";
			$id("logo").removeEventListener("mouseout", remove_about_window);
		}
	};

	self.draw = function(station_list) {
		API.add_callback(update_tuned_in_status, "user");

		if (MOBILE) {
			self.mobile_draw(station_list);
			return;
		}

		// Localization
		$id("chat_link").textContent = $l("chat");
		$id("history_link").textContent = $l("previouslyplayed");
		$id("forums_link").textContent = $l("forums");
		$id("calendar_link").textContent = $l("events_calendar_link");

		$id("logo").addEventListener("click", function() { 
			$id("about_window").className = "info";
			$id("logo").addEventListener("mouseout", remove_about_window);
		});

		// Setup user info
		elements.user_info = $id("user_info");
		if (User.id > 1) {
			if (User.avatar) {
				elements.user_info.appendChild($el("img", { "class": "avatar icon", "src": User.avatar }));
			}
			else {
				elements.user_info.appendChild($el("img", { "class": "avatar icon", "src": "/static/images4/user.svg" }));	
			}
			elements.user_info.appendChild($el("span", { "textContent": User.name }));

			var user_links = elements.user_info.appendChild($el("div", { "class": "info" }));
			user_links.appendChild($el("a", { "class": "link link_obvious", "id": "user_info_link", "textContent": $l("your_statistics") }));
			user_links.lastChild.addEventListener("click", function() { DetailView.open_listener(User.id); });
			user_links.appendChild($el("a", { "class": "link_obvious", "id": "logout_link", "href": "http://rainwave.cc/forums/", "textContent": $l("logout_in_forums") }));
			var qr_code_container = user_links.appendChild($el("div", { "id": "user_qr_code_hover", "textContent": $l("your_mobile_app_qr") }));
			var qr_code = qr_code_container.appendChild($el("div", { "id": "user_qr_code" }));
			qr_code_container.addEventListener("mouseover", add_user_qr_code);
		}
		else {
			elements.user_info.appendChild($el("img", { "class": "avatar icon", "src": "/static/images4/user.svg" }));
			elements.user_info.appendChild($el("a", { "href": "http://rainwave.cc/forums/ucp.php?mode=login&redirect=/", "textContent": $l("login") }));
		}

		// Setup station select menu
		var order = [ 5, 1, 4, 2, 3 ];
		var ul = $id("station_select");
		var mouseenter = "onmouseenter" in ul;
		var a, li, info;
		var beta_add = window.location.href.indexOf("beta") !== -1 ? "/beta/" : "";
		for (var i = 0; i < order.length; i++) {
			li = ul.appendChild($el("li"));
			li._station_id = parseInt(order[i]);		// ugh gotta make sure this is a COPY of the integer
			li.addEventListener(mouseenter ? "mouseenter" : "mouseover", show_station_info);
			a = $el("a", { "textContent": $l("station_name_" + order[i] ) });
			if (order[i] in station_list) {
				a.setAttribute("href", station_list[order[i]].url + beta_add);
			}
			li.appendChild(a);
			
			if (order[i] == User.sid) {
				$add_class(li, "selected");
			}
			info = li.appendChild($el("div", { "class": "info" }));
			info.appendChild($el("div", { "class": "menu_now_playing", "textContent": $l("now_playing_on_...", { "station": $l("station_name_" + order[i]) }) }));
			elements[order[i]] = info;
			info.appendChild($el("div", { "class": "station_menu_description", "textContent": $l("station_menu_description_id_" + order[i]) }));
		}
		API.add_callback(update_station_info, "all_stations_info");

		$id("calendar_menu_item").addEventListener("mouseover", insert_calendar_iframe);
		$id("twitter_menu_item").addEventListener("mouseover", insert_twitter_widget);
	};

	self.mobile_draw = function(station_list) {
		if (User.id > 1) {
			$id("top_menu").insertBefore($el("div", { "textContent": User.name, "style": "color: #777; font-size: smaller; margin: 5px 0 0 0; padding-right: 5px; position: absolute; transform: translateX(-100%); left: 100%; z-index: 1;" }), $id("top_menu").firstChild);
		}

		var order = [ 5, 1, 4, 2, 3 ];
		order.splice(order.indexOf(User.sid), 1);
		order.unshift(User.sid);
		var ul = $id("station_select");
		var a, li;
		var beta_add = window.location.href.indexOf("beta") !== -1 ? "/beta/" : "";
		for (var i = 0; i < order.length; i++) {
			li = ul.appendChild($el("li"));
			li._station_id = parseInt(order[i]);		// ugh gotta make sure this is a COPY of the integer
			a = li.appendChild($el("a", { "textContent": "Rainwave " + $l("station_name_" + order[i] ) }));
			if ((order[i] in station_list) && (order[i] != User.sid)) {
				a.setAttribute("href", station_list[order[i]].url + beta_add);
			}
			else if (order[i] == User.sid) {
				a.parentNode.addEventListener("click", self.toggle_mobile_pulldown);
				a.parentNode.style.cursor = "pointer";
			}
			
			if (order[i] == User.sid) {
				$add_class(li, "selected");
			}
		}
	};

	self.toggle_mobile_pulldown = function(e) {
		if (mobile_height_toggled) {
			mobile_height_toggled = false
			$id("station_select").style.height = null;
		}
		else {
			mobile_height_toggled = true;
			$id("station_select").style.height = $id("station_select").scrollHeight + "px";
		}
	};

	var insert_calendar_iframe = function(e) {
		$id("calendar_menu_item").removeEventListener("mouseover", insert_calendar_iframe);
		$id("calendar_dropdown").appendChild($el("iframe", { "class": "calendar_iframe", "src": "https://www.google.com/calendar/embed?showTitle=0&showNav=0&showDate=0&showPrint=0&showCalendars=0&mode=AGENDA&height=500&wkst=1&bgcolor=%23ffffff&src=rainwave.cc_9anf0lu3gsjmgb6k3fcoao894o@group.calendar.google.com&color=%232952A3", "frameborder": "0", "scrolling": "no" }));
	};

	var insert_twitter_widget = function(e) {
		$id("twitter_menu_item").removeEventListener("mouseover", insert_twitter_widget);
		var script = $el("script", { "src": "http://platform.twitter.com/widgets.js", "type": "application/javascript" });
		script.addEventListener("load", create_twitter_widget);
		document.getElementsByTagName("head")[0].appendChild(script);
	};

	var create_twitter_widget = function(e) {
		twttr.widgets.load($id("twitter_dropdown"));
	};

	var show_station_info = function(e) {
		var sid = this._station_id || e.target._station_id || e.target.parentNode._station_id;
		if (!sid || !songs[sid]) return;
		if (songs[sid]._shown) return;
		songs[sid]._shown = true;

		if (elements[sid].firstChild.nextSibling.className == "timeline_song") {
			elements[sid].replaceChild(songs[sid].el, elements[sid].firstChild.nextSibling);
		}
		else {
			elements[sid].insertBefore(songs[sid].el, elements[sid].firstChild.nextSibling);
		}
	};

	var update_station_info = function(json) {
		for (var key in json) {
			if (json[key]) {
				json[key].albums = [ { "art": json[key].art, "name": json[key].album } ];
				songs[key] = TimelineSong.new(json[key]);
				songs[key]._shown = false;
			}
		}
	};

	var add_user_qr_code = function(evt) {
		this.removeEventListener("mouseover", add_user_qr_code);
		$id("user_qr_code").style.backgroundImage = "url(http://chart.apis.google.com/chart?cht=qr&chs=300x300&choe=ISO-8859-1&chl=" + "rw://" + User.id + ":" + User.api_key + "@rainwave.cc" + ")";
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