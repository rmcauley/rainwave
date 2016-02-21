(function() {
	"use strict";

	var RWTemplateObject = function(_c) {
		this._c = _c;
		if (RWTemplateObject.prototype.error) {
			this.error = RWTemplateObject.prototype.error.bind(this);
		}
		if (RWTemplateObject.prototype.success) {
			this.success = RWTemplateObject.prototype.success.bind(this);
		}
	};

	window.RWTemplateObject = RWTemplateObject;

	if (typeof(RWTemplates) === "object") {
		RWTemplates.set_object(RWTemplateObject);
	}

	var RWTemplateHelpers;

	if (typeof(window.RWTemplateHelpers) !== "undefined") {
		RWTemplateHelpers = window.RWTemplateHelpers;
	}
	else {
		RWTemplateHelpers = {};
		window.RWTemplateHelpers = RWTemplateHelpers;
	}

	RWTemplateHelpers.copyObject = function(obj) {
		var newobj = Object.prototype.toString.call(obj) === "[object Array]" ? [] : {};
		for (var i in obj) {
			if ((i.charAt(0) === "$") || (i.charAt(0) === "_")) {
				// console.log(i + ": skipping $ or _");
			}
			else if (typeof(obj[i]) === "function") {
				// console.log(i + ": skipping function");
			}
			else if (Object.prototype.toString.call(obj[i]) === "[object Object]") {
				// console.log(i + ": diving into object");
				newobj[i] = RWTemplateHelpers.copyObject(obj[i]);
			}
			else if (Object.prototype.toString.call(obj[i]) === "[object Array]") {
				// console.log(i + ": diving into array");
				newobj[i] = RWTemplateHelpers.copyObject(obj[i]);
			}
			else {
				// console.log(i + ": copying");
				newobj[i] = obj[i];
			}
		}
		return newobj;
	};

	RWTemplateHelpers.array_render = function(arr, template, el, pcontext) {
		if (!arr.$t) {
			arr.$t = new RWTemplateObject(arr);
		}

		var i;
		if (Object.prototype.toString.call(arr) === "[object Object]") {
			for (i in arr) {
				if (arr.hasOwnProperty(i) && (typeof(arr[i]) !== "function")) {
					template({ "key": i, "value": arr[i] }, el);
				}
			}
			return;
		}

		if (!arr._shadows) arr._shadows = [];
		arr._shadows.push({
			"arr": arr.slice(),
			"template": template,
			"el": el,
			"render_append": arr.render_append,
			"render_positions": arr.render_positions,
			"render_delete": arr.render_delete,
			"pre_append": arr.pre_append,
			"post_append": arr.post_append,
			"post_update": arr.post_update,
			"pre_update": arr.pre_update,
			"pcontext": (arr.post_append && pcontext) ? pcontext : null
		});
		if (typeof(arr.pre_update) === "function") {
			arr.pre_update(arr);
		}
		for (i = 0; i < arr.length; i++) {
			if (typeof(arr.pre_append) === "function") {
				arr.pre_append(arr[i], pcontext);
			}
			if (!arr[i].$t) {
				arr[i].$t = new RWTemplateObject(arr[i]);
			}
			if (typeof(arr.render_append) === "function") {
				template(arr[i], null, i);
				arr.render_append(el, arr[i]);
			}
			else {
				arr[i].$t.__i = i;
				template(arr[i], el, i);
				if (!arr[i].$t.item_root) {
					throw("Array rendered without item_root element.");
				}
			}
			if (typeof(arr.post_append) === "function") {
				arr.post_append(arr[i], pcontext);
			}
		}
		if (typeof(arr.post_update) === "function") {
			arr.post_update(arr);
		}
	};

	RWTemplateHelpers.array_item_delete = function(el, deleted) {
		if (deleted.$t && deleted.$t.item_root) {
			for (var i = 0; i < deleted.$t.item_root.length; i++) {
				if (deleted.$t.item_root[i].parentNode === el) {
					el.removeChild(deleted.$t.item_root[i]);
				}
			}
		}
		else {
			console.warn("Cannot delete array item from page - make sure your template has a bind='item_root' inside the {{#each}} block if you want to enable automatic HTML element removal.");
		}
	};

	RWTemplateHelpers.array_update = function(arr, fullrender) {
		if (!arr._shadows) return;

		var shadow, exists, i, j, s, changed;
		for (s = 0; s < arr._shadows.length; s++) {
			shadow = arr._shadows[s];

			if (typeof(shadow.pre_update) === "function") {
				shadow.pre_update(arr);
			}

			// find things that no longer exist
			for (i = shadow.arr.length - 1; i >= 0; i--) {
				exists = arr.indexOf(shadow.arr[i]);
				if (exists === -1) {
					changed = true;
					(shadow.render_delete || arr.render_delete || RWTemplateHelpers.array_item_delete)(shadow.el, shadow.arr[i]);
				}
			}

			// find things that don't exist yet
			for (i = 0; i < arr.length; i++) {
				exists = shadow.arr.indexOf(arr[i]);
				if (exists === -1) {
					changed = true;
					if (shadow.pre_append) {
						shadow.pre_append(arr[i], shadow.pcontext);
					}
					if (!arr[i].$t) {
						arr[i].$t = new RWTemplateObject(arr[i]);
					}
					if (arr._preserve_item_roots && arr[i].$t && arr[i].$t.item_root && arr[i].$t.item_root.length) {
						shadow.el.appendChild(arr[i].$t.item_root[0]);
					}
					else if (shadow.template) {
						arr[i].$t.__i = i;
						shadow.template(arr[i], shadow.el);
					}
					if (shadow.render_append) {
						shadow.render_append(shadow.el, arr[i]);
					}
					if (shadow.post_append) {
						shadow.post_append(arr[i], shadow.pcontext);
					}
				}
				else if (exists !== i) {
					changed = true;
				}
			}

			shadow.arr = arr.slice();

			if (fullrender) {
				for (i = 0; i < arr.length; i++) {
					if (arr[i].$t) {
						arr[i].$t.update();
					}
				}
			}

			if (changed) {
				if (shadow.render_positions) {
					shadow.render_positions();
				}
				else if (arr.length > 0 && arr[0].$t.item_root) {
					for (i = 0; i < arr.length; i++) {
						for (j = 0; j < arr[i].$t.item_root.length; j++) {
							if (arr[i].$t.item_root[j].parentNode) {
								arr[i].$t.item_root[j].parentNode.appendChild(arr[i].$t.item_root[j]);
							}
						}
					}
				}
				else if (arr.length > 0) {
					console.warn("Array can't be updated with correct HTML sorting - make sure your array item templates have bind='item_root' to enable automatic HTML element position sorting.");
				}
			}

			if (typeof(shadow.post_update) === "function") {
				shadow.post_update(arr);
			}
		}
	};

	RWTemplateHelpers.elem_update = function(elem, val) {
		if (typeof(val) === "undefined") return;
		if (typeof(elem) !== "object") return;
		if (!elem.getAttribute) return;
		if (elem.hasAttribute("noupdates")) return;
		var elemval = val;
		var tagname = elem.tagName.toLowerCase();
		if (elem.getAttribute("helper")) {
			var hname = elem.getAttribute("helper");
			if (!RWTemplateHelpers[hname]) {
				throw("Helper " + hname + " doesn't exist.");
			}
			elemval = RWTemplateHelpers[hname](val, elem);
			if (elemval === undefined) return;
		}
		if (tagname === "select") {
			elem.value = val;
		}
		else if (tagname === "input") {
			if (elem.getAttribute("type") === "radio") {
				if (elem.getAttribute("value") === val) {
					elem.checked = true;
				}
				else {
					elem.checked = false;
				}
			}
			else if (elem.getAttribute("type") === "checkbox") {
				if (val && (val !== "False") && (val !== "false")) {
					elem.checked = true;
				}
				else {
					elem.checked = false;
				}
			}
			else if (document.activeElement !== elem) {
				elem.value = elemval;
			}
		}
		else if ((tagname === "textarea") && (document.activeElement !== elem)) {
			if (elem.value != elemval) {					// eslint-disable-line eqeqeq
				elem.value = elemval;
			}
		}
		else if (tagname === "img") {
			elem.setAttribute("src", elemval);
		}
		else {
			elem.textContent = elemval || "";
		}
	};

	RWTemplateObject.prototype.update = function(fromObject) {
		if (Object.prototype.toString.call(this._c) === "[object Array]") {
			return RWTemplateHelpers.array_update(this._c);
		}

		var val, i;
		var from = fromObject || this._c;
		for (i in from) {
			if (!from.hasOwnProperty(i)) continue;
			if (i.charAt(0) === "$") continue;

			val = from[i];
			if (typeof(val) === "undefined") {
				// do nothing
			}
			else if (Object.prototype.toString.call(val) === "[object Array]") {
				RWTemplateHelpers.array_update(val, true);
			}
			else if ((Object.prototype.toString.call(val) === "[object Object]") && val.$t) {
				if (val.$t instanceof RWTemplateObject) {
					val.$t.update();
				}
				else {
					throw("$t is not an RWTemplateObject.");
				}
			}
			else if (typeof(this[i]) === "function") {
				this[i](val);
			}
			else if (typeof(this[i]) === "object") {
				for (var eli = 0; eli < this[i].length; eli++) {
					RWTemplateHelpers.elem_update(this[i][eli], val);
				}
			}
		}
	};

	RWTemplateHelpers.array_reconcile = function(fresh, existing) {
		if (!existing._unique_field && !existing._update_in_order && !existing._exact_match) {
			// console.warn("Array that we're trying to update does not have a _unique_field property.");
			// console.warn(existing);
			return;
		}
		var i, j, found;
		if (existing._update_in_order) {
			for (i = 0; i < Math.min(fresh.length, existing.length); i++) {
				if (existing[i] && existing[i].$t) {
					existing[i].$t.update_data(fresh[i]);
				}
				else {
					existing[i] = fresh[i];
				}
			}
			for (i = existing.length; i < fresh.length; i++) {
				existing.push(fresh[i]);
			}
			while (existing.length > fresh.length) {
				existing.pop();
			}
		}
		else if (existing._exact_match) {
			for (j = existing.length - 1; j >= 0; j--) {
				found = false;
				for (i = fresh.length - 1; i >= 0; i--) {
					if (fresh[i] === existing[j]) {
						found = true;
						break;
					}
				}
				if (!found) {
					existing.splice(j, 1);
				}
			}
			for (i = fresh.length - 1; i >= 0; i--) {
				found = false;
				for (j = existing.length - 1; j >= 0; j--) {
					if (fresh[i] === existing[j]) {
						found = true;
					}
				}
				if (!found) {
					if (i < existing.length) {
						existing.splice(i, 0, fresh[i]);
					}
					else {
						existing.push(fresh[i]);
					}
				}
			}
		}
		else {
			for (j = existing.length - 1; j >= 0; j--) {
				found = false;
				for (i = fresh.length - 1; i >= 0; i--) {
					if (fresh[i][existing._unique_field] === existing[j][existing._unique_field]) {
						found = true;
						break;
					}
				}
				if (!found) {
					existing.splice(j, 1);
				}
			}

			for (i = fresh.length - 1; i >= 0; i--) {
				found = false;
				for (j = existing.length - 1; j >= 0; j--) {
					if (fresh[i][existing._unique_field] === existing[j][existing._unique_field]) {
						if (existing[j].$t) {
							existing[j].$t.update_data(fresh[i]);
						}
						else {
							existing[j] = fresh[i];
						}
						found = true;
						break;
					}
				}
				if (!found) {
					if (i < existing.length) {
						existing.splice(i, 0, fresh[i]);
					}
					else {
						existing.push(fresh[i]);
					}
				}
			}

			var map = {};
			for (i = 0; i < existing.length; i++) {
				map[existing[i][existing._unique_field]] = existing[i];
			}
			for (i = 0; i < fresh.length; i++) {
				if (existing[i][existing._unique_field] != fresh[i][existing._unique_field]) { // eslint-disable-line eqeqeq
					existing[i] = map[fresh[i][existing._unique_field]];
				}
			}
		}
	};

	RWTemplateObject.prototype.update_data = function(newData) {
		var newObj = newData || (this.get ? this.get() : {});
		if (Object.prototype.toString.call(this._c) === "[object Array]") {
			if (newObj) {
				RWTemplateHelpers.array_reconcile(newObj, this._c);
			}
			return RWTemplateHelpers.array_update(this._c);
		}
		for (var i in newObj) {
			if (!newObj.hasOwnProperty(i)) {
				// do nothing
			}
			else if (i.charAt(0) === "$") {
				// do nothing
			}
			else if (this._c[i] && ((Object.prototype.toString.call(this._c[i]) === "[object Array]") || (Object.prototype.toString.call(newObj[i]) === "[object Array]"))) {
				if (Object.prototype.toString.call(this._c[i]) === Object.prototype.toString.call(newObj[i])) {
					RWTemplateHelpers.array_reconcile(newObj[i], this._c[i]);
				}
				else {
					console.warn("Mismatching object and error when updating object (new, old, key):");
					console.warn(newObj, this._c, i);
				}
			}
			else if ((typeof(this._c[i]) === "object") && this._c[i] && this._c[i].$t) {
				this._c[i].$t.update_data(newObj[i]);
			}
			else {
				this._c[i] = newObj[i];
			}
		}
	};
}());
