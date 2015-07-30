var Fave = function(json) {
	"use strict";
	var self = {};
	self.album_callback = null;

	BOOTSTRAP.on_init.push(function(template) {
		API.add_callback("fave_song_result", song_fave_update);
		API.add_callback("fave_album_result", album_fave_update);
	});

	var change_fave = function(el_name, json, favetype) {
		if (!json.success) return;

		var faves = document.getElementsByName(el_name);
		var funcn = json.fave ? "add" : "remove";
		for (var i = 0; i < faves.length; i++) {
			faves[i].classList[funcn]("is_fave");
			if (faves[i].parentNode) faves[i].parentNode.classList[funcn](favetype + "_fave_highlight");
			if (faves[i]._go_one_up) faves[i].parentNode.parentNode.classList[funcn](favetype + "_fave_highlight");
		}

		if ((favetype == "album") && self.album_callback) self.album_callback(json);
	};

	var song_fave_update = function(json) {
		change_fave("sfave_" + json.id, json, "song");
	};

	var album_fave_update = function(json) {
		change_fave("afave_" + json.id, json, "album");
		if (self.album_callback) {
			self.album_callback(json);
		}
	};

	var do_fave = function(e) {
		if (!this._fave_id) return;
		if (e && e.stopPropagation) e.stopPropagation();
		var set_to = !this.classList.contains("is_fave");
		if (this.getAttribute("name") && this.getAttribute("name").substring(0, 5) == "sfave") {
			API.async_get("fave_song", { "fave": set_to, "song_id": this._fave_id });
		}
		else {
			API.async_get("fave_album", { "fave": set_to, "album_id": this._fave_id });
		}
	};

	self.do_fave = do_fave;

	self.register = function(json, is_album) {
		if (User.id <= 1) return;
		if (json.fave) {
			json.$t.fave.classList.add("is_fave");
			if (json.$t.fave.parentNode) {
				if (is_album) json.$t.fave.parentNode.classList.add("album_fave_highlight");
				else json.$t.fave.parentNode.classList.add("song_fave_highlight");
			}
		}
		json.$t.fave.setAttribute("name", is_album ? "afave_" + json.id : "sfave_" + json.id);
		json.$t.fave._fave_id = json.id;
		json.$t.fave.addEventListener("click", do_fave);
	};

	return self;
}();
