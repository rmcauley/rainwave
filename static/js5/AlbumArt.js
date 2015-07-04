var AlbumArt = function() {
	"use strict";

	var expand_art = function(e) {
		e.stopPropagation();

		var tgt = this;
		if (tgt.classList.contains("art_expanded")) {
			normalize_art(e);
			return;
		}

		var x = e.pageX ? e.pageX : e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		var y = e.pageY ? e.pageY : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

		tgt.classList.add("art_expanded");
		if ((x < (Sizing.width - 270))) {
			tgt.classList.add("art_expand_right");
		}
		else {
			tgt.classList.add("art_expand_left");
		}
		if ((y < (Sizing.height - 270))) {
			tgt.classList.add("art_expand_down");
		}
		else {
			tgt.classList.add("art_expand_up");
		}

		if (("_album_art" in tgt) && tgt._album_art) {
			var full_res = document.createElement("img");
			full_res.onload = function() {
				tgt.style.backgroundImage = "url(" + full_res.getAttribute("src") + ")";
			};
			full_res.setAttribute("src", tgt._album_art + "_320.jpg");
			tgt._album_art = null;
		}
	};

	var normalize_art = function(e) {
		// This used to be zIndex = 2 for reasons
		e.target.style.zIndex = null;
		e.target.classList.remove("art_expanded");
		e.target.classList.remove("art_expand_right");
		e.target.classList.remove("art_expand_left");
		e.target.classList.remove("art_expand_down");
		e.target.classList.remove("art_expand_up");
		// I don't know why I did this
		//Fx.chain_transition(e.target, function() { e.target.style.zIndex = null; Fx.stop_chain(e.target); } );
	};

	return function(art_url, element) {
		if (!art_url) {
			art_url = "/static/baked/art/1_27";
		}
		if (!art_url || (art_url.length === 0)) {
			element.style.backgroundImage = "url(/static/images4/noart_1.jpg)";
		}
		else {
			element.classList.add("art_expandable");
			if (window.devicePixelRatio && (window.devicePixelRatio > 1.5)) {
				element.style.backgroundImage = "url(" + art_url + "_320.jpg)";
			}
			else {
				element.style.backgroundImage = "url(" + art_url + "_120.jpg)";
				element._album_art = art_url;
			}
			element.addEventListener("click", expand_art);
			element.addEventListener("mouseout", normalize_art);
		}
	};
}();