var Albums = function() {
	"use strict";
	var self = {};

	var expand_art = function(e) {
		e.stopPropagation();
		var tgt = e.target.nodeName == "IMG" ? e.target.parentNode : e.target;
		if ($has_class(tgt, "art_expanded")) {
			normalize_art(e);
			return;
		}
		
		$add_class(tgt, "art_expanded");
		if (Mouse.x < (SCREEN_WIDTH - 270)) {
			$add_class(tgt, "art_expand_right");
		}
		else {
			$add_class(tgt, "art_expand_left");
		}
		if (Mouse.y < (SCREEN_HEIGHT - 270)) {
			$add_class(tgt, "art_expand_down");
		}
		else {
			$add_class(tgt, "art_expand_up");
		}

		if (("_album_art" in tgt) && tgt._album_art) {
			var full_res = $el("img", { "class": "art_image", "src": tgt._album_art + ".jpg" });
			full_res.onload = function() {
				tgt.replaceChild(full_res, tgt.firstChild);
				full_res.onload = null;	// enables the old image to be garbage collected
				full_res.addEventListener("click", expand_art);
			};
			tgt._album_art = null;
		}
	};

	var mouseout = function(e) {
		var reltg = (e.relatedTarget) ? e.relatedTarget : e.toElement;    
    	if ((reltg == e.target.parentNode) || (reltg == e.target.firstChild)) {
    		e.stopPropagation();
    		e.preventDefault();
    		return false;
    	}
    	normalize_art(e);
	};

	var normalize_art = function(e) {
		var tgt = e.target.nodeName == "IMG" ? e.target.parentNode : e.target;
		tgt.style.zIndex = 2;
		$remove_class(tgt, "art_expanded");
		$remove_class(tgt, "art_expand_right");
		$remove_class(tgt, "art_expand_left");
		$remove_class(tgt, "art_expand_down");
		$remove_class(tgt, "art_expand_up");
		Fx.chain_transition(tgt, function() { tgt.style.zIndex = null; Fx.stop_chain(tgt); } );
	};

	self.art_html = function(json, size, not_expandable) {
		if (!size) size = 120;
		var c = $el("div", { "class": "art_anchor" });
		var img, ac;
		if (!json.art) {
			ac = c.appendChild($el("div", { "class": "art_container" }));
			img = ac.appendChild($el("img", { "class": "art_image", "src": "/static/images4/noart_1.jpg" }));
		}
		else {
			ac = c.appendChild($el("div", { "class": "art_container" }));
			img = ac.appendChild($el("img", { "class": "art_image", "src": json.art + "_" + size + ".jpg" }));
			if (!not_expandable) {
				$add_class(ac, "art_expandable")
				ac._album_art = json.art || "/static/images4/test";
				ac.addEventListener("click", expand_art);
				img.addEventListener("click", expand_art);
				ac.addEventListener("mouseout", mouseout);
			}
		}
		return c;
	};

	return self;
}();