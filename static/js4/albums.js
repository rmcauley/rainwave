var Albums = function() {
	"use strict";
	var self = {};

	var expand_art = function(e) {
		var tgt = this;
		if ($has_class(tgt, "art_expanded")) {
			normalize_art(e);
			return;
		}
		
		$add_class(tgt, "art_expanded");
		if (MOBILE || (Mouse.x < (SCREEN_WIDTH - 270))) {
			$add_class(tgt, "art_expand_right");
		}
		else {
			$add_class(tgt, "art_expand_left");
		}
		if (MOBILE || (Mouse.y < (SCREEN_HEIGHT - 270))) {
			$add_class(tgt, "art_expand_down");
		}
		else {
			$add_class(tgt, "art_expand_up");
		}

		if (("_album_art" in tgt) && tgt._album_art) {
			var full_res = $el("img", { "class": "art_image", "src": tgt._album_art + ".jpg" });
			full_res.onload = function() {
				tgt.style.backgroundImage = "url(" + full_res.getAttribute("src") + ")";
			};
			tgt._album_art = null;
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
		if (!size && MOBILE) size = 240;
		else if (!size) size = 120;
		var c = $el("div", { "class": "art_anchor" });
		var img, ac;
		if (json.secret_user_sauce) {
			ac = c.appendChild($el("div", { "class": "art_container" }));
			if (json.secret_user_sauce.indexOf("svg") == -1) ac.className = "art_container avatar";
			ac.style.backgroundImage = "url(" + json.secret_user_sauce + ")";	
		}
		else if (!json.art) {
			ac = c.appendChild($el("div", { "class": "art_container" }));
			ac.style.backgroundImage = "url(/static/images4/noart_1.jpg)";
		}
		else {
			ac = c.appendChild($el("div", { "class": "art_container" }));
			if (!MOBILE && window.devicePixelRatio && (window.devicePixelRatio > 1.5)) {
				ac.style.backgroundImage = "url(" + json.art + ".jpg)";
			}
			else {
				ac.style.backgroundImage = "url(" + json.art + "_" + size + ".jpg)";
			}
			if (!not_expandable) {
				$add_class(ac, "art_expandable")
				ac._album_art = json.art;
				ac.addEventListener("click", expand_art);
				ac.addEventListener("mouseout", normalize_art);
			}
		}
		return c;
	};

	return self;
}();