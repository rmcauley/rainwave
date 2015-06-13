var R4Notify = function() {
	"use strict";

	var self = {};
	self.capable = typeof(Notification) !== "undefined" ? true : false;
	self.enabled = false;
	var current_song_id;

	BOOTSTRAP.on_init.push(function(template) {
		Prefs.define("notify", [ false, true ]);
		if (!self.capable) return;
		if (MOBILE) return;

		Prefs.add_callback("notify", self.check_permission);
		self.check_permission();
		API.add_callback("sched_current", self.notify);
	});

	self.check_permission = function() {
		if (!self.capable) return;
		if (!Prefs.get("notify")) return;
		if (self.enabled) return;

		Notification.requestPermission(function (status) {
			if (Notification.permission !== status) {
				Notification.permission = status;
			}

			if (status === "granted") {
				self.enabled = true;
			}
		});
	};

	self.notify = function(sched_current) {
		if (!self.capable) return;
		if (!self.enabled) return;
		if (!Prefs.get("notify")) return;
		if (!sched_current || !sched_current.songs || sched_current.songs.length === 0) return;
		if (document.body.classList.contains("loading")) return;
		if (sched_current.songs[0].id == current_song_id) return;
		current_song_id = sched_current.songs[0].id;

		var art = sched_current.songs[0].albums[0].art ? sched_current.songs[0].albums[0].art + "_120.jpg" : "/static/images4/noart_1.jpg";
		var artists = "";
		for (var i = 0; i < sched_current.songs[0].artists.length; i++) {
			if (i > 0) artists += ", ";
			artists += sched_current.songs[0].artists[i].name;
		}
		var n = new Notification(sched_current.songs[0].title, { body: sched_current.songs[0].albums[0].name + "\n" + artists, tag: "current_song", icon: art });
		n.onshow = function () {
  			setTimeout(n.close.bind(n), 5000);
		};
	};

	return self;
}();