var AlbumArt = function() {
	"use strict";

	var expand_art = function(e) {
		e.stopPropagation();

		var tgt = this;

		if (this._reset_router && Sizing.simple) {
			Router.change();
		}

		if (this.parentNode.parentNode.classList.contains("song")) {
			if (this.parentNode.parentNode._art_timeout) {
				clearTimeout(this.parentNode.parentNode._art_timeout);
				this.parentNode.parentNode._art_timeout = null;
			}
			this.parentNode.parentNode.style.zIndex = 5;

			if (this.parentNode.parentNode.parentNode.classList.contains("timeline_event")) {
				this.parentNode.parentNode.parentNode.style.zIndex = 5;
			}
		}

		if (!tgt.classList.contains("art_container")) return;
		if (tgt.classList.contains("art_expanded")) {
			normalize_art({ "target": this });
			return;
		}

		var x = e.pageX ? e.pageX : e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
		var y = e.pageY ? e.pageY : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;

		tgt.classList.add("art_expanded");
		if (x < (Sizing.width - 270)) {
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
				var fs = document.createElement("div");
				fs.className = "art_full_size";
				fs.style.backgroundImage = "url(" + full_res.getAttribute("src") + ")";
				tgt.appendChild(fs);
				requestNextAnimationFrame(function() { fs.classList.add("loaded"); });
			};
			full_res.setAttribute("src", tgt._album_art + "_320.jpg");
			tgt._album_art = null;
		}
	};

	var normalize_art = function(e) {
		e.target.style.zIndex = null;
		e.target.classList.remove("art_expanded");
		e.target.classList.remove("art_expand_right");
		e.target.classList.remove("art_expand_left");
		e.target.classList.remove("art_expand_down");
		e.target.classList.remove("art_expand_up");

		if (e.target.parentNode.parentNode.classList.contains("song")) {
			e.target.parentNode.parentNode._art_timeout = setTimeout(function() {
				e.target.parentNode.parentNode.style.zIndex = e.target.parentNode.parentNode._zIndex;

				if (e.target.parentNode.parentNode.parentNode.classList.contains("timeline_event")) {
					e.target.parentNode.parentNode.parentNode.style.zIndex = null;
				}
			}, 350);
		}
	};

	return function(art_url, element, no_expand) {
		if (!art_url || (art_url.length === 0)) {
			element.style.backgroundImage = "url(/static/images4/noart_1.jpg)";
		}
		else {
			if (!MOBILE && window.devicePixelRatio && (window.devicePixelRatio > 1.5)) {
				element.style.backgroundImage = "url(" + art_url + "_320.jpg)";
				element._album_art = art_url;
			}
			else if (!MOBILE && Sizing.simple && !Sizing.small) {
				element.style.backgroundImage = "url(" + art_url + "_240.jpg)";
				element._album_art = art_url;
			}
			else {
				element.style.backgroundImage = "url(" + art_url + "_120.jpg)";
				element._album_art = art_url;
			}
			if (!MOBILE && !no_expand) {
				element.classList.add("art_expandable");
				element.addEventListener("click", expand_art);
				element.addEventListener("mouseleave", normalize_art);
			}
		}
	};
}();
