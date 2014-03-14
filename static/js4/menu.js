var Menu = function() {
	var self = {};
	var elements = {};

	self.initialize = function(station_list) {
		$id("player").insertBefore($el("img", { "class": "avatar", "src": User.avatar }), $id("player").firstChild);
		var order = [ 5, 1, 4, 3, 2 ];
		var ul = $id("station_select");
		var li, info;
		for (var i = 0; i <= order.length; i++) {
			if (!(order[i] in station_list)) continue;
			li = ul.appendChild($el("li"));
			li.appendChild($el("a", { "href": station_list[order[i]].url, "textContent": $l("station_name_" + station_list[order[i]].id ) }));
			info = li.appendChild($el("div", { "class": "info" }));
			elements[order[i]] = {};
			elements[order[i]].art = info.appendChild(Albums.art_html({ "art": null }));
			elements[order[i]].title = info.appendChild($el("div", { "class": "title" }));
			elements[order[i]].album = info.appendChild($el("div", { "class": "album" }));
		}
		API.add_callback(update_station_info, "all_stations_info");
	};

	var update_station_info = function(json) {
		for (var key in json) {
			if (json[key]) {
				Albums.change_art(elements[key].art, json[key].art);
				elements[key].title.textContent = json[key].title;
				elements[key].album.textContent = json[key].album;
			}
		}
	};

	return self;
}();