var Albums = function() {
	var self = {};

	var expand_art = function(e) {
		if (e.target.parentNode._expanded) {
			normalize_art(e);
			return;
		}
		if (!$has_class(e.target.parentNode, "art_expandable")) return;
		$remove_class(e.target.parentNode, "art_expandable");
		e.target.addEventListener("mouseout", normalize_art);
		if (Mouse.x < (document.documentElement.clientWidth - 250)) {
			$add_class(e.target.parentNode, "art_expand_right");
		}
		else {
			$add_class(e.target.parentNode, "art_expand_left");
		}
		if (Mouse.y < (document.documentElement.clientHeight - 250)) {
			$add_class(e.target.parentNode, "art_expand_down");
		}
		else {
			$add_class(e.target.parentNode, "art_expand_up");
		}
		e.target.parentNode._expanded = true;

		if (("_album_art" in e.target) && e.target._album_art) {
			var full_res = $el("img", { "class": "art", "src": e.target._album_art + ".jpg" });
			full_res.addEventListener("click", expand_art);
			full_res.addEventListener("mouseout", normalize_art);
			// replacing the art while the transition is happening results in a size pop rather than a continued transition
			// we also simply can't switch the src or users see the image loading
			// the result is this complicated bit, which waits for the transition to end before replacing if complete
			// if the image is not yet completely loaded we put an onload event on which will replace it when it's done
			// if you try using Fx.chain_transition it simply doesn't work very well - it fires the change too early
			setTimeout(function() {
				if (full_res.complete) {
					e.target.parentNode.replaceChild(full_res, e.target);
				}
				else {
					full_res.onload = function() {
						e.target.parentNode.replaceChild(full_res, e.target);
						full_res.onload = null;	// enables the old image to be garbage collected
					};
				}
			}, 350);
			e.target._album_art = null;
		}
	};

	var normalize_art = function(e) {
		e.target.parentNode._expanded = false;
		$add_class(e.target.parentNode, "art_expandable");
		$remove_class(e.target.parentNode, "art_expand_right");
		$remove_class(e.target.parentNode, "art_expand_left");
		$remove_class(e.target.parentNode, "art_expand_down");
		$remove_class(e.target.parentNode, "art_expand_up");
		e.target.removeEventListener("mouseout", normalize_art);
	};

	self.art_html = function(json, size, not_expandable) {
		if (!size) size = 120;
		var c = $el("div", { "class": "art_container" });
		var img;
		if (!json.art) {
			img = c.appendChild($el("img", { "class": "art no_art", "src": "/static/images4/noart_1.jpg" }));
		}
		else {
			img = c.appendChild($el("img", { "class": "art", "src": json.art + "_" + size + ".jpg" }));
			if (!not_expandable) {
				$add_class(c, "art_expandable")
				img._album_art = json.art;
				img.addEventListener("click", expand_art);
			}
		}
		return c;
	};

	self.change_art = function(art_container, new_art_url, size) {
		if (!size) size = 120;
		if (new_art_url) {
			$add_class(art_container, "art_expandable");
			art_container.firstChild._album_art = new_art_url;
			art_container.firstChild.setAttribute("src", new_art_url + "_" + size + ".jpg");
			art_container.firstChild.addEventListener("click", expand_art);
		}
		else {
			$remove_class(art_container, "art_expandable");
			art_container.firstChild._album_art = null;
			art_container.firstChild.removeEventListener("click", expand_art);
			art_container.firstChild.setAttribute("src", "/static/images4/noart_1.jpg");
		}
	};

	return self;
}();