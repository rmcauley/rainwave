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
docCookies.removeItem("r4_prefs", "/", BOOTSTRAP.cookie_domain);
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
		localStorage.setItem(name, JSON.stringify(values));
	};

	self.load = function(name) {
		values = JSON.parse(localStorage.getItem(name)) || {};
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
		values[name] = value;
		if (!skip_callbacks) {
			do_callbacks(name, value);
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

	var do_callbacks = function(name, value) {
		for (var i in callbacks[name]) {
			callbacks[name][i](value);
		}
	};

	// One of the few times we don't have an initialize() in R4
	// prefs should be loaded before anything else
	self.load("r4_prefs");

	return self;
}();

var SettingsWindow = function() {
	var el;
	var self = {};

	self.initialize = function() {
		el = $id("settings_window");
	};

	self.draw = function() {
		el.appendChild($el("h4", { "textContent": $l("tab_title_preferences") }));
		draw_cb_list([
			"show_clock_in_titlebar",
			"show_rating_in_titlebar",
			"show_song_in_titlebar"
		]);
		
		el.appendChild($el("h4", { "textContent": $l("playlist_preferences") }));
		var div = el.appendChild($el("div", { "class": "setting_group" }));
		var playlist_sort = $el("select", { "id": "prefs_playlist_sort_by" });
		var option;
		for (var i = 0; i < PlaylistLists.sorting_methods.length; i++) {
			option = $el("option", { "value": PlaylistLists.sorting_methods[i], "textContent": $l("prefs_sort_playlist_by_" + PlaylistLists.sorting_methods[i]) });
			if (PlaylistLists.sorting_methods[i] == Prefs.get("playlist_sort")) {
				option.setAttribute("selected", "selected");
			}
			playlist_sort.appendChild(option);
		}
		playlist_sort.addEventListener("change", change_sorting_method);
		div.appendChild(playlist_sort);
		div.appendChild($el("label", { "for": "prefs_playlist_sort_by", "textContent": $l("prefs_playlist_sort_by") }));

		draw_cb_list([
			"playlist_sort_available_first",
			"playlist_sort_faves_first",
			"playlist_show_rating_complete"
		]);

		el.appendChild($el("h4", { "textContent": $l("m3u_downloads") }));
		div = el.appendChild($el("div", { "class": "setting_group" }));
		div.appendChild($el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": "mp3.m3u", "class": "info_right" }));
		div.appendChild($el("div", { "textContent": "iTunes/Winamp" }));
		div = el.appendChild($el("div", { "class": "setting_group" }));
		div.appendChild($el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": "mp3.m3u", "class": "info_right" }));
		div.appendChild($el("div", { "textContent": "Windows Media" }));
		div = el.appendChild($el("div", { "class": "setting_group" }));
		div.appendChild($el("a", { "href": "/tune_in/" + User.sid + ".ogg", "textContent": "opus.ogg.m3u", "class": "info_right" }));
		div.appendChild($el("div", { "textContent": "Foobar2000" }));
	};

	var draw_cb_list = function(pref_list) {
		var cb, div, label;
		for (var i = 0; i < pref_list.length; i++) {
			div = $el("div", { "class": "setting_group" });
			cb = div.appendChild($el("input", { "type": "checkbox", "id": "prefs_" + pref_list[i] }));
			cb._pref_name = pref_list[i];
			cb.addEventListener("change", checkbox_changed);
			if (Prefs.get(pref_list[i])) cb.setAttribute("checked", true);
			label = div.appendChild($el("label", { "for": "prefs_" + pref_list[i], "textContent": $l("prefs_" + pref_list[i]) }));
			el.appendChild(div);
		}
	}

	var checkbox_changed = function(pref_list) {
		Prefs.change(this._pref_name, this.checked);
	};

	var change_sorting_method = function(evt) {
		Prefs.change("playlist_sort", this.value);
	};

	return self;
}();