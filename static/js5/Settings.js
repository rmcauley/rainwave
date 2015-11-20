var SettingsWindow = function() {
	"use strict";
	var p = Prefs.get_meta();
	Modal($l("Settings"), "settings", p);

	var bool_setup = function(key, obj) {
		obj.$t.item_root.addEventListener("click", function() {
			Prefs.change(key, !Prefs.get(key));
			if (Prefs.get(key)) {
				obj.$t.item_root.classList.add("yes");
				obj.$t.item_root.classList.remove("no");
			}
			else {
				obj.$t.item_root.classList.remove("yes");
				obj.$t.item_root.classList.add("no");
			}
		});
		if (Prefs.get(key)) {
			obj.$t.item_root.classList.add("yes");
		}
		else {
			obj.$t.item_root.classList.add("no");
		}
	};

	var multi_highlight = function(el) {
		Prefs.change(pref_name, e.target._value);

		var w = e.target.offsetWidth;
		var h = e.target.offsetHeight;
		var l = e.target.offsetLeft;
		var t = e.target.offsetTop;
		var reflow_trigger;

		for (var i = 0; i < e.target.parentNode.childNodes.length; i++) {
			$remove_class(e.target.parentNode.childNodes[i], "selected");
			if ($has_class(e.target.parentNode.childNodes[i], "selected_first")) {
				$remove_class(e.target.parentNode.childNodes[i], "selected_first");
				highlighter.style.transition = "none";
				var w2 = e.target.parentNode.childNodes[i].offsetWidth;
				var h2 = e.target.parentNode.childNodes[i].offsetHeight;
				var l2 = e.target.parentNode.childNodes[i].offsetLeft;
				var t2 = e.target.parentNode.childNodes[i].offsetTop;
				highlighter.style.width = w2 + "px";
				highlighter.style.height = h2 + "px";
				highlighter.style[Fx.transform_string] = "translate(" + l2 + "px, " + t2 + "px)";
                // trigger style recalculation so this happens w/o transition
                // this will match the highlighter to the first selected element
                highlighter.offsetWidth;    // jshint ignore:line
                // now we can remove the transition safely
                highlighter.style.transition = null;
            }
            $remove_class(e.target.parentNode.childNodes[i], "selected_first");
        }
        $add_class(e.target, "selected");

        highlighter.style.width = w + "px";
        highlighter.style.height = h + "px";
        highlighter.style[Fx.transform_string] = "translate(" + l + "px, " + t + "px)";
    };
	};

	var multi_setup = function(key, obj) {
		for (var i in obj.legal_values) {
			obj.legal_values[i].$t.link.addEventListener("click", function() {

			});
		}
	};

	for (var i in p) {
		if (p.bool) {
			bool_setup(i, p[i]);
		}
		else {
			multi_setup(i, p[i]);
		}

		if (i == "t_tl") {
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
			p[i].$t.item_root.addEventListener("click", t_tl_check);
			t_tl_check();
		}
	}
};
