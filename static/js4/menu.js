var Menu = function() {
	var self = {};
	var elements = {};
	var songs = {};

	self.draw = function(station_list) {
		// Localization
		$id("chat_link").textContent = $l("chat");
		$id("history_link").textContent = $l("Previous Songs");
		$id("forums_link").textContent = $l("forums");

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
		}
		else {
			elements.user_info.appendChild($el("img", { "class": "avatar icon", "src": "/static/images4/user.svg" }));
			elements.user_info.appendChild($el("a", { "href": "http://rainwave.cc/forums/ucp.php?mode=login&redirect=/", "textContent": $l("login") }));
		}

		// Setup station select menu
		var order = [ 5, 1, 4, 2, 3 ];
		var ul = $id("station_select");
		var a, li, info;
		var beta_add = window.location.href.indexOf("beta") !== -1 ? "/beta/" : "";
		for (var i = 0; i < order.length; i++) {
			li = ul.appendChild($el("li"));
			li._station_id = parseInt(order[i]);		// ugh gotta make sure this is a COPY of the integer
			li.addEventListener("mouseover", show_station_info);
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
	};

	var show_station_info = function(e) {
		var sid = this._station_id || e.target._station_id || e.target.parentNode._station_id;
		if (!sid || !songs[sid]) return;

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
			}
		}
	};

	return self;
}();