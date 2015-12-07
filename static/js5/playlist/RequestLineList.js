var RequestLineList = function(el) {
	"use strict";
	var self = SearchList(el, "username", "username");
	self.$t.no_result_message.textContent = $l("nobody_in_line");
	self.auto_trim = true;
	self.loaded = true;
	self.list_item_height = 65;

	API.add_callback("request_line", function(json) {
		for (var i = 0; i < json.length; i++) {
			json[i].id = json[i].user_id;
		}
		self.update(json);
	});

	self.sort_function = function(a, b) {
		if (self.data[a].position < self.data[b].position) return -1;
		else if (self.data[a].position > self.data[b].position) return 1;
		return 0;
	};

	self.draw_entry = function(item) {
		item.id = item.user_id;
		item.name_searchable = Formatting.make_searchable_string(item.username);
		item._el = document.createElement("div");
		item._el.className = "item";
		item._user = document.createElement("div");
		item._song_title = document.createElement("div");
		item._song_title.className = "requestlist_song";
		item._album_title = document.createElement("div");
		item._album_title.className = "requestlist_album";
		item._el.appendChild(item._user);
		item._el.appendChild(item._song_title);
		item._el.appendChild(item._album_title);
		self.update_item_element(item);
	};

	self.update_item_element = function(item) {
		item._user.textContent = item.position + ". " + item.username;
		if (item.skip || !item.song) {
			item._el.classList.add("skip");
		}
		else {
			item._el.classList.remove("skip");
		}
		if (item.song) {
			item._song_title.textContent = item.song.title;
			item._album_title.textContent = item.song.album_name;
		}
		else {
			item._song_title.textContent = $l("no_song_selected");
			item._album_title.textContent = "";
		}
	};

	self.open_id = function(id) {
		Router.change("request_line", id);
	};

	Sizing.add_resize_callback(function() {
		self.list_item_height = Sizing.small ? 51 : 65;
	});

	return self;
};
