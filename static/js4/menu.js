var Menu = function() {
	var self = {};
	var elements = {};
	var songs = {};

	self.draw = function(station_list) {
		// Localization
		$id("chat_link").textContent = $l("chat");
		$id("history_link").textContent = $l("Previous Songs");
		$id("forums_link").textContent = $l("forums");
		$id("calendar_link").textContent = $l("events_calendar_link");

		// Setup user info
		elements.user_info = $id("user_info");
		if (User.id > 1) {
			if (User.avatar) {
				elements.user_info.appendChild($el("img", { "class": "avatar icon", "src": User.avatar }));
			}
			else {
				elements.user_info.appendChild($el("img", { "class": "avatar icon", "src": "/static/images4/user.svg" }));	
			}
			elements.user_info.appendChild($el("span", { "class": "icon_description", "textContent": User.name }));
		}
		else {
			elements.user_info.appendChild($el("img", { "class": "avatar icon", "src": "/static/images4/user.svg" }));
			elements.user_info.appendChild($el("a", { "href": "http://rainwave.cc/forums/ucp.php?mode=login&redirect=/", "textContent": $l("login") }));
		}
		var user_links = elements.user_info.appendChild($el("div", { "class": "info" }));
		user_links.appendChild($el("a", { "id": "logout_link", "href": "http://rainwave.cc/forums/", "textContent": $l("logout_in_forums") }));
		var qr_code_container = user_links.appendChild($el("div", { "id": "user_qr_code_hover", "textContent": $l("your_mobile_app_qr") }));
		var qr_code = qr_code_container.appendChild($el("div", { "id": "user_qr_code" }));
		qr_code_container.addEventListener("mouseover", add_user_qr_code);

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

		API.add_callback(update_tuned_in_status, "user");
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
		$id("user_qr_code").style.backgroundImage = "url(http://chart.apis.google.com/chart?cht=qr&chs=300x300&choe=ISO-8859-1&chl=" + User.api_key + ")";
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