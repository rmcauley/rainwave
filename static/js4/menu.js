var Menu = function() {
	var self = {};
	var elements = {};

	self.draw = function(station_list) {
		// Localization
		$id("chat_link").textContent = $l("chat");
		$id("history_link").textContent = $l("Previous Songs");
		$id("forums_link").textContent = $l("forums");

		// Setup user info
		elements.user_info = $id("user_info");
		if (User.id > 1) {
			if (User.avatar) {
				elements.user_info.appendChild($el("img", { "class": "avatar", "src": User.avatar }));
			}
			else {
				elements.user_info.appendChild($el("img", { "class": "avatar", "src": "/static/images4/user.svg" }));	
			}
			elements.user_info.appendChild($el("span", { "textContent": User.name }));
		}
		else {
			elements.user_info.appendChild($el("img", { "class": "avatar", "src": "/static/images4/user.svg" }));
			elements.user_info.appendChild($el("a", { "href": "http://rainwave.cc/forums/ucp.php?mode=login&redirect=/", "textContent": $l("login") }));
		}

		// Setup station select menu
		var order = [ 5, 1, 4, 2, 3 ];
		var ul = $id("station_select");
		var a, li, info;
		var beta_add = window.location.href.indexOf("beta") !== -1 ? "/beta/" : "";
		for (var i = 0; i < order.length; i++) {
			li = ul.appendChild($el("li"));
			a = $el("a", { "textContent": $l("station_name_" + order[i] ) });
			if (order[i] in station_list) {
				a.setAttribute("href", station_list[order[i]].url + beta_add);
			}
			li.appendChild(a);
			
			if (i == User.sid) {
				$add_class(li, "selected");
			}
			info = li.appendChild($el("div", { "class": "info" }));
			info.appendChild($el("div", { "class": "station_menu_description", "textContent": $l("station_menu_description_id_" + order[i]) }));
			elements[order[i]] = {};
			elements[order[i]].art = info.appendChild(Albums.art_html({ "art": null }));
			elements[order[i]].title = info.appendChild($el("div", { "class": "title" }));
			elements[order[i]].album = info.appendChild($el("div", { "class": "album" }));
		}
		API.add_callback(update_station_info, "all_stations_info");
	};

	var update_station_info = function(json) {
		var new_art;
		for (var key in json) {
			if (json[key]) {
				new_art = Albums.art_html(json[key], null, true);
				elements[key].art.parentNode.replaceChild(new_art, elements[key].art);
				elements[key].art = new_art;
				elements[key].title.textContent = json[key].title;
				elements[key].album.textContent = json[key].album;
			}
		}
	};

	return self;
}();