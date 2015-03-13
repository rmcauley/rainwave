var AboutWindow = {
	draw: function() {
		$id("staff_list_header").textContent = $l("staff_list_header");
		$id("relay_sponsors_header").textContent = $l("relay_sponsors_header");
		$id("translators_header").textContent = $l("translators_header");
		$id("icon_attribution").textContent = $l("icon_attribution");
		$id("design_by").textContent = $l("design_by");
		$id("about_donations_label").textContent = $l("donation_info_label");
		$id("about_donations_link").textContent = $l("donation_info_link");
		$id("about_github_label").textContent = $l("github_info_label");
		$id("about_github_link").textContent = $l("github_info_link");
	}
};