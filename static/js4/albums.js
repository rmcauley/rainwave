var Albums = function() {
	"use strict";
	var self = {};

	var expand_art = function(e) {
		if ($has_class(e.target, "art_expanded")) {
			normalize_art(e);
			return;
		}
		
		$add_class(e.target, "art_expanded");
		if (Mouse.x < (SCREEN_WIDTH - 270)) {
			$add_class(e.target, "art_expand_right");
		}
		else {
			$add_class(e.target, "art_expand_left");
		}
		if (Mouse.y < (SCREEN_HEIGHT - 270)) {
			$add_class(e.target, "art_expand_down");
		}
		else {
			$add_class(e.target, "art_expand_up");
		}

		if (("_album_art" in e.target) && e.target._album_art) {
			var full_res = $el("img", { "class": "art_image", "src": e.target._album_art + ".jpg" });
			full_res.onload = function() {
				e.target.style.backgroundImage = "url(" + full_res.getAttribute("src") + ")";
			};
			e.target._album_art = null;
		}
	};

	var normalize_art = function(e) {
		e.target.style.zIndex = 2;
		$remove_class(e.target, "art_expanded");
		$remove_class(e.target, "art_expand_right");
		$remove_class(e.target, "art_expand_left");
		$remove_class(e.target, "art_expand_down");
		$remove_class(e.target, "art_expand_up");
		Fx.chain_transition(e.target, function() { e.target.style.zIndex = null; Fx.stop_chain(e.target); } );
	};

	self.art_html = function(json, size, not_expandable) {
		if (!size) size = 120;
		var c = $el("div", { "class": "art_anchor" });
		var img, ac;
		if (!json.art) {
			ac = c.appendChild($el("div", { "class": "art_container" }));
			ac.style.backgroundImage = "url(/static/images4/noart_1.jpg)";
		}
		else {
			ac = c.appendChild($el("div", { "class": "art_container" }));
			ac.style.backgroundImage = "url(" + json.art + "_" + size + ".jpg)";
			if (!not_expandable) {
				$add_class(ac, "art_expandable")
				ac._album_art = json.art;
				ac.addEventListener("click", expand_art);
				ac.addEventListener("mouseout", normalize_art);
			}
		// }
		return c;
	};

	return self;
}();