var Menu = function() {
	var self = {};

	self.initialize = function() {
		$id("station_select_1_link").textContent = $l("station_name_game")
		$id("station_select_2_link").textContent = $l("station_name_ocremix")
		$id("station_select_3_link").textContent = $l("station_name_covers")
		$id("station_select_4_link").textContent = $l("station_name_chiptune")
		$id("station_select_5_link").textContent = $l("station_name_all")
	};

	return self;
}();