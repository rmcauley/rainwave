// docCookies, by Mozilla.
var docCookies = {
  getItem: function (sKey) {
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!sKey || !this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + ( sDomain ? "; domain=" + sDomain : "") + ( sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};

// Remove legacy settings
docCookies.removeItem("r3sid", "/", BOOTSTRAP.cookie_domain);
docCookies.removeItem("r3prefs", "/", BOOTSTRAP.cookie_domain);

/* Preferences for R4 */

var Prefs = function() {
	"use strict";
	var meta = {};
	var values = {};
	var self = {};
	var callbacks = {};

	self.save = function(name, object) {
		docCookies.setItem(name, JSON.stringify(values), Infinity, "/", BOOTSTRAP.cookie_domain);
	};

	self.load = function(name) {
		var mmm_cookie = docCookies.getItem(name);
		try {
			values = JSON.parse(mmm_cookie);
		}
		catch (err) {
			// silently fail, resetting all preferences to their defaults
			values = {};
		}
		if (!values) values = {};
		return true;
	};

	self.get = function(name) {
		if (!values) return false;
		if (!(name in values)) {
			if (name in meta) {
				return meta[name].legal_values[0];
			}
			return false;
		}
		return values[name];
	};

	self.change = function(name, value, skip_callbacks) {
		if (!(name in meta)) {
			return false;
		}
		if (value === self.get(name)) return;
		if (meta[name].verify_function) {
			if (!meta[name].verify_functon(value)) {
				return false;
			}
		}
		// if (meta[name].legal_values) {
		// 	var valid = false;
		// 	for (var i in meta[name].legal_values) {
		// 		if (value === meta[name].legal_values[name][i]) {
		// 			valid = true;
		// 		}
		// 	}
		// 	if (!valid) {
		// 		return false;
		// 	}
		// }
		var old_value = values[name];
		values[name] = value;
		if (!skip_callbacks) {
			do_callbacks(name, value, old_value);
		}
		// do this AFTER callbacks in case a callback triggers a JS error
		self.save("r4_prefs");
		if (meta[name].reload_trigger) {
			window.location.reload();
		}
		return true;
	};

	// always false by default: enforce consistency!
	self.define_boolean = function(name) {
		self.define(name, [ false, true ]);
	};

	self.define = function(name, legal_values, verify_function) {
		if (meta[name]) return;
		meta[name] = {};
		meta[name].legal_values = legal_values;
		meta[name].verify_function = verify_function ? verify_function : null;
		if (values && !(name in values)) {
			values[name] = legal_values ? legal_values[0] : false;
		}
		callbacks[name] = [];
	};

	self.add_callback = function(name, method) {
		callbacks[name].push(method);
	};

	var do_callbacks = function(name, value, old_value) {
		for (var i in callbacks[name]) {
			callbacks[name][i](value, old_value);
		}
	};

	// One of the few times we don't have an initialize() in R4
	// prefs should be loaded before anything else
	self.load("r4_prefs");

	return self;
}();

var SettingsWindow = function() {
	"use strict";
	var el;
	var self = {};

	self.initialize = function() {
		el = $id("settings_window");
		Prefs.add_callback("show_title_in_titlebar", self.enable_disable_title_options);
	};

	self.enable_disable_title_options = function(nv) {
		if (nv) {
			$id("prefs_show_clock_in_titlebar").parentNode.style.opacity = 1;
			$id("prefs_show_rating_in_titlebar").parentNode.style.opacity = 1;
		}
		else {
			$id("prefs_show_clock_in_titlebar").parentNode.style.opacity = 0.5;
			$id("prefs_show_rating_in_titlebar").parentNode.style.opacity = 0.5;
		}
	};

	self.change_language = function(e) {
		docCookies.setItem("rw_lang", this._value, Infinity, "/", BOOTSTRAP.cookie_domain);
		document.location.reload();
	};

	self.draw = function() {
		var div = el.appendChild($el("div", { "class": "setting_group setting_group_special" }));
		var langs = $el("div", { "class": "multi_select unselectable", "id": "prefs_language" });
		var option;
		var locale_names = [];
		for (var i in BOOTSTRAP.locales) {
			locale_names.push(i);
		}
		locale_names.sort();
		for (i = 0; i < locale_names.length; i++) {
			option = $el("span", { "class": "link", "textContent": BOOTSTRAP.locales[locale_names[i]] });
			option._value = locale_names[i];
			if (locale_names[i] == LOCALE) {
				$add_class(option, "selected selected_first");
			}
			option.addEventListener("click", self.change_language);
			langs.appendChild(option);
		}
		div.appendChild(langs);
		div.appendChild($el("label", { "for": "prefs_language", "textContent": $l("change_language") }));

		div = el.appendChild($el("div", { "class": "setting_group setting_group_special" }));
		div.appendChild($el("label", { "textContent": $l("m3u_downloads") }));
		div = div.appendChild($el("div", { "class": "multi_select multi_select_special unselectable" }));
		option = div.appendChild($el("span"));
		option.appendChild($el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": "iTunes MP3", "class": "link", "target": "_blank" }));
		option = div.appendChild($el("span", { "class": "setting_group" }));
		option.appendChild($el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": "Windows MP3", "class": "link", "target": "_blank" }));
		option = div.appendChild($el("span", { "class": "setting_group" }));
		option.appendChild($el("a", { "href": "/tune_in/" + User.sid + ".ogg", "textContent": "Foobar2000 Ogg", "class": "link", "target": "_blank" }));

		div = el.appendChild($el("div", { "class": "setting_group setting_group_special" }));
		div.appendChild($el("label", { "textContent": $l("site_mode") }));
		div = div.appendChild($el("div", { "class": "multi_select multi_select_special unselectable" }));
		option = div.appendChild($el("span", { "id": "site_mode_selector_basic", "class": "link", "textContent": $l("basic") }));
		option.addEventListener("click", function(e) { Prefs.change("stage", 2); });
		option = div.appendChild($el("span", { "id": "site_mode_selector_full", "class": "link", "textContent": $l("full") }));
		option.addEventListener("click", function(e) { Prefs.change("stage", 4); });

		el.appendChild($el("div", { "class": "setting_subheader", "textContent": $l("timeline_preferences") }));
		draw_cb_list([ "show_artists" ]);
		div = el.appendChild($el("div", { "class": "setting_group" }));
		var sticky_history_size = $el("div", { "id": "prefs_sticky_history_size", "class": "multi_select unselectable" });
		var histsize_highlighter = sticky_history_size.appendChild($el("div", { "class": "floating_highlight" }));
		for (i = 0; i <= 5; i++) {
			option = $el("span", { "class": "link", "textContent": i != 0 ? i : $l("none") });
			option._value = i;
			if (i == Prefs.get("sticky_history_size")) {
				$add_class(option, "selected selected_first");
			}
			option.addEventListener("click", function(e) { multi_select_change(e, "sticky_history_size", histsize_highlighter); });
			sticky_history_size.appendChild(option);
		}
		div.appendChild(sticky_history_size);
		div.appendChild($el("label", { "textContent": $l("prefs_sticky_history_size") }));

		el.appendChild($el("div", { "class": "setting_subheader", "textContent": $l("tab_title_preferences") }));
		draw_cb_list([
			"show_title_in_titlebar",
			"show_clock_in_titlebar",
			"show_rating_in_titlebar"
		]);
		
		el.appendChild($el("div", { "class": "setting_subheader", "textContent": $l("playlist_preferences") }));
		div = el.appendChild($el("div", { "class": "setting_group" }));
		var playlist_sort = $el("div", { "id": "prefs_playlist_sort_by", "class": "multi_select unselectable" });
		var playlist_sort_highlighter = playlist_sort.appendChild($el("div", { "class": "floating_highlight" }));
		for (i = 0; i < PlaylistLists.sorting_methods.length; i++) {
			option = $el("span", { "class": "link", "textContent": $l("prefs_sort_playlist_by_" + PlaylistLists.sorting_methods[i]) });
			option._value = PlaylistLists.sorting_methods[i];
			if (PlaylistLists.sorting_methods[i] == Prefs.get("playlist_sort")) {
				$add_class(option, "selected selected_first");
			}
			option.addEventListener("click", function(e) { multi_select_change(e, "playlist_sort", playlist_sort_highlighter); });
			playlist_sort.appendChild(option);
		}
		div.appendChild(playlist_sort);
		div.appendChild($el("label", { "for": "prefs_playlist_sort_by", "textContent": $l("prefs_playlist_sort_by") }));

		draw_cb_list([
			"playlist_sort_available_first",
			"playlist_sort_faves_first",
			"playlist_show_rating_complete",
			"playlist_show_escape_icon",
		]);

		self.enable_disable_title_options(Prefs.get("show_title_in_titlebar"));
	};

	var multi_select_change = function(e, pref_name, highlighter) {
		Prefs.change(pref_name, e.target._value);

		var w = e.target.offsetWidth;
		var h = e.target.offsetHeight;
		var l = e.target.offsetLeft;
		var t = e.target.offsetTop;

		for (var i = 0; i < e.target.parentNode.childNodes.length; i++) {
			$remove_class(e.target.parentNode.childNodes[i], "selected");
			if ($has_class(e.target.parentNode.childNodes[i], "selected_first")) { 
				$remove_class(e.target.parentNode.childNodes[i], "selected_first")
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
				highlighter.offsetWidth;
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
	/* YES/NO BOXES ... totally worth the effort */

	var force_yes = function(e) {
		if (e) e.stopPropagation();
		if ($has_class(this.parentNode, "no")) { 
			$remove_class(this.parentNode, "yes");
			$remove_class(this.parentNode, "no");
			this.parentNode.offsetWidth;  // gotta force that style recalculation :/

			$add_class(this.parentNode, "yes");
		}
		else { 
			$add_class(this.parentNode, "yes");
		}
		yes_no_value_check(this.parentNode);
	};

	var force_no = function(e) {
		if (e) e.stopPropagation();
		if (!$has_class(this.parentNode, "yes")) return;
		$add_class(this.parentNode, "no");
		$remove_class(this.parentNode, "yes");
		yes_no_value_check(this.parentNode);
	};

	var yes_no_swap = function(e) {
		if (e) e.stopPropagation();
		if ($has_class(this._cb, "no")) { 
			$remove_class(this._cb, "yes");
			$remove_class(this._cb, "no");
			this._cb.offsetWidth;  // gotta force that style recalculation :/

			$add_class(this._cb, "yes");
		}
		else if ($has_class(this._cb, "yes")) { 
			$add_class(this._cb, "no");
		}
		else {
			$add_class(this._cb, "yes");
		}
		yes_no_value_check(this._cb);
	};

	var yes_no_value_check = function(cb) {
		if ($has_class(cb, "no")) {
			Prefs.change(cb._pref_name, false);
			console.log(false);
		}
		else if ($has_class(cb, "yes")) {
			Prefs.change(cb._pref_name, true);	
			console.log(true);
		}
		else {
			Prefs.change(cb._pref_name, false);
			console.log(false);
		}
	}

	var draw_cb_list = function(pref_list, special) {
		var cb, div, label, yes, no, dot, bar;
		for (var i = 0; i < pref_list.length; i++) {
			div = $el("div", { "class": "setting_group yes_no_group" });
			if (special) $add_class(div, "setting_group_special");
			cb = div.appendChild($el("div", { "class": "yes_no_wrapper" }));
			yes = cb.appendChild($el("span", { "class": "yes_no_yes", "textContent": $l("yes") }));
			yes.addEventListener("click", force_yes);
			bar = cb.appendChild($el("span", { "class": "yes_no_bar" }));
			dot = cb.appendChild($el("span", { "class": "yes_no_dot" }));
			no = cb.appendChild($el("span", { "class": "yes_no_no", "textContent": $l("no") }));
			no.addEventListener("click", force_no);

			cb._pref_name = pref_list[i];
			div.addEventListener("click", yes_no_swap);
			div._cb = cb;
			if (Prefs.get(pref_list[i])) $add_class(cb, "yes");
			label = div.appendChild($el("label", { "id": "prefs_" + pref_list[i], "textContent": $l("prefs_" + pref_list[i]) }));
			el.appendChild(div);
		}
	}

	return self;
}();