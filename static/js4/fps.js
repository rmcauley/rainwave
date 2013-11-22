FPSCounter = function() {
	var self = {};
	var el;

	var last_frame_count;
	var last_frame_time;

	var loop = function() {
		var new_fps = Math.round((window.mozPaintCount - last_frame_count) / ((Clock.hi_res_time() - last_frame_time) / 1000));
		if (new_fps > 5) {
			el.textContent = new_fps + "fps";
		}
		last_frame_time = Clock.hi_res_time();
		last_frame_count = window.mozPaintCount;
	}

	self.initialize = function() {
		el = document.getElementsByTagName("body")[0].appendChild($el("div", { "id": "fpscounter"}));
		last_frame_count = 0;
		last_frame_time = Clock.hi_res_time();
		setInterval(loop, 1000);
	};

	return self;
}();