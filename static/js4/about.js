var AboutWindow = {
	draw: function() {
		var icon_descs = [
			"forum_icon_desc",
			"chat_icon_desc",
			"help_icon_desc",
			"gear_icon_desc",
			"history_icon_desc",
			"user_icon_desc",
			"facebook_icon_desc",
			"calendar_icon_desc"
		];
		for (var i = 0; i < icon_descs.length; i++) {
			$id(icon_descs[i]).textContent = $l(icon_descs[i]);
		}

		$id("staff_list_header").textContent = $l("staff_list_header");
		$id("relay_sponsors_header").textContent = $l("relay_sponsors_header");
		$id("special_thanks").textContent = $l("special_thanks");
		$id("translators_header").textContent = $l("translators_header");
		$id("icon_attribution").textContent = $l("icon_attribution");
	}
};