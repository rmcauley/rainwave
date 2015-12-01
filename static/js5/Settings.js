var SettingsWindow = function() {
	"use strict";
	var p = Prefs.get_meta();
	p.p_sort.legal_values[0].name = $l("prefs_sort_playlist_by_alpha");
	p.p_sort.legal_values[1].name = $l("prefs_sort_playlist_by_rating_user");
	var ct = Modal($l("Settings"), "settings", p);
	if (Prefs.powertripped) {
		ct._root.classList.add("powertripped");
	}

	var t_tl_check = function() {
		if (Prefs.get("t_tl")) {
			p.t_clk.$t.item_root.style.opacity = 1;
			p.t_rt.$t.item_root.style.opacity = 1;
		}
		else {
			p.t_clk.$t.item_root.style.opacity = 0.5;
			p.t_rt.$t.item_root.style.opacity = 0.5;
		}
	};

	var bool_setup = function(key, obj) {
		var check = function() {
			if (Prefs.get(key)) {
				if (obj.$t.wrap.classList.contains("no")) {
					obj.$t.wrap.classList.remove("yes");
					obj.$t.wrap.classList.remove("no");
					obj.$t.wrap.offsetWidth;   // jshint ignore:line
				}
				obj.$t.wrap.classList.add("yes");
			}
			else if (obj.$t.wrap.classList.contains("yes")) {
				obj.$t.wrap.classList.add("no");
				obj.$t.wrap.classList.remove("yes");
			}
			else {
				obj.$t.wrap.classList.remove("yes");
			}
			if (key == "pwr") {
				window.location.reload();
			}
		};
		obj.$t.item_root.addEventListener("click", function(e) {
			e.stopPropagation();
			Prefs.change(key, !Prefs.get(key));
			check();
			if (key == "t_tl") {
				t_tl_check();
			}
		});
		obj.$t.yes.addEventListener("click", function(e) {
			e.stopPropagation();
			Prefs.change(key, true);
			check();
			if (key == "t_tl") {
				t_tl_check();
			}
		});
		obj.$t.no.addEventListener("click", function(e) {
			e.stopPropagation();
			Prefs.change(key, false);
			check();
			if (key == "t_tl") {
				t_tl_check();
			}
		});
		if (Prefs.get(key)) {
			obj.$t.wrap.classList.add("yes");
		}
	};

	var multi_highlight = function(el, highlighter) {
		var w = el.offsetWidth;
		var h = el.offsetHeight;
		var l = el.offsetLeft;
		var t = el.offsetTop;

		for (var i = 0; i < el.parentNode.childNodes.length; i++) {
			el.parentNode.childNodes[i].classList.remove("selected");
        }
        el.classList.add("selected");

        highlighter.style.width = w + "px";
        highlighter.style.height = h + "px";
        highlighter.style[Fx.transform] = "translate(" + l + "px, " + t + "px)";
    };

	var multi_setup = function(key, obj, val) {
		if (key == "locales") {
			val.$t.link.addEventListener("click", function() {
				Prefs.change_language(val.value);
			});
		}
		else {
			val.$t.link.addEventListener("click", function() {
				Prefs.change(key, val.value);
				multi_highlight(val.$t.link, obj.$t.highlight);
			});
		}
	};

	var highlight_later = function(el, highlighter) {
		setTimeout(function() {
			multi_highlight(el, highlighter);
		}, 400);
	};

	var i, j;
	for (i in p) {
		if (!p[i].$t) {
			continue;
		}

		if (p[i].bool) {
			bool_setup(i, p[i]);
		}
		else {
			for (j in p[i].legal_values) {
				multi_setup(i, p[i], p[i].legal_values[j]);
				if (p[i].value == p[i].legal_values[j].value) {
					p[i].legal_values[j].$t.link.classList.add("selected");
					highlight_later(p[i].legal_values[j].$t.link, p[i].$t.highlight);
				}
			}
		}
	}
};
