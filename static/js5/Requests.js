var Requests = function() {
	"use strict";
	var self = {};

	self.make_clickable = function(el, song_id) {
		el.addEventListener("click", function() { self.add(song_id); } );
	};

	return self;
}();