/*\
|*|
|*|  :: cookies.js ::
|*|
|*|  A complete cookies reader/writer framework with full unicode support.
|*|
|*|  https://developer.mozilla.org/en-US/docs/DOM/document.cookie
|*|
|*|  This framework is released under the GNU Public License, version 3 or later.
|*|  http://www.gnu.org/licenses/gpl-3.0-standalone.html
|*|
|*|  Syntaxes:
|*|
|*|  * docCookies.setItem(name, value[, end[, path[, domain[, secure]]]])
|*|  * docCookies.getItem(name)
|*|  * docCookies.removeItem(name[, path], domain)
|*|  * docCookies.hasItem(name)
|*|  * docCookies.keys()
|*|
\*/

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

/* Preferences for R4 */

var Prefs = function() {
	"use strict";
	var meta = {};
	var values = {};
	var self = {};
	var callbacks = {};

	self.save = function(name, object) {
		var today = new Date();
		var expiry = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000 * 13);
		var sfied = JSON.stringify(values);
		if (heavyencode) {
			sfied = encodeURIComponent(sfied);
		}
		else {
			sfied = sfied.replace("%", "%25");
			sfied = sfied.replace("+", "%2B");
			sfied = sfied.replace("=", "%3D");
			sfied = sfied.replace(";", "%3B");
			sfied = sfied.replace(",", "%2C");
		}
		docCookies.setItem(name, sfied, Infinity, "/", BOOTSTRAP.cookie_domain);
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
		return true;
	};

	self.get = function(name) {
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
		if (meta[name].legal_values) {
			var valid = false;
			for (var i in meta[name].legal_values) {
				if (value === meta[name].legal_values[name][i]) {
					valid = true;
				}
			}
			if (!valid) {
				return false;
			}
		}
		values[name] = value;
		if (!skip_callbacks) {
			do_callbacks(name, value);
		}
		// do this AFTER callbacks in case a callback triggers a JS error
		self.save();
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
		if (!(name in values)) {
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
	self.load();

	return self;
}();
