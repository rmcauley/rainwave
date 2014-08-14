var AboutWindow = {
	draw: function() {
		$id("staff_list_header").textContent = $l("staff_list_header");
		$id("relay_sponsors_header").textContent = $l("relay_sponsors_header");
		$id("translators_header").textContent = $l("translators_header");
		$id("icon_attribution").textContent = $l("icon_attribution");
		$id("design_by").textContent = $l("design_by");
		$id("github_link").textContent = $l("open_sourced_at_github")

		$id("donation_information").textContent = $l("donate_and_paypal_info");
	}
};