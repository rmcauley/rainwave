if (typeof(RWTemplateObject) == "undefined") {
    window.RWTemplateObject=function(_c){"use strict";this._c=_c;};
}
if (typeof(RWTemplateHelpers) == "undefined") {
    window.RWTemplateHelpers={};
}

RWTemplateHelpers.array_render = function(arr, template, el) {
    "use strict";
    if (!arr._shadows) arr._shadows = [];
    arr._shadows.push({
        "arr": arr.slice(),
        "template": template,
        "el": el,
        "render_append": arr.render_append,
        "render_positions": arr.render_positions,
        "render_delete": arr.render_delete
    });
    for (var i = 0; i < arr.length; i++) {
        if (typeof(arr.render_append) == "function") {
            arr.render_append(el, arr[i]);
        }
        else {
            template(arr[i], el);
            if (!arr[i].$t._root) {
                throw("Array rendered without root element.");
            }
        }
    }
};

RWTemplateHelpers.array_item_delete = function(container_el, deleted_array_item) {
    "use strict";
    if (deleted_array_item.$t && deleted_array_item.$t.item_root) {
        for (var i = 0; i < deleted_array_item.$t.item_root.length; i++) {
            if (deleted_array_item.$t.item_root[i].parentNode == container_el) {
                container_el.removeChild(deleted_array_item.$t.item_root[i]);
            }
        }
    }
    else {
        console.warn("Cannot delete array item from page - make sure your template has a bind='item_root' inside the {{#each}} block if you want to enable automatic HTML element removal.");
    }
};

RWTemplateHelpers.array_update = function(arr) {
    "use strict";
    if (!arr._shadows) return;

    var shadow;
    for (var s = 0; s < arr._shadows.length; s++) {
        shadow = arr._shadows[s];

        // find things that no longer exist
        var exists, i, j;
        for (i = shadow.arr.length -1; i >= 0; i--) {
            exists = arr.indexOf(shadow.arr[i]);
            if (exists === -1) {
                (shadow.render_delete || arr.render_delete || RWTemplateHelpers.array_item_delete)(shadow.el, shadow.arr[i]);
            }
        }

        // find things that don't exist yet
        for (i = 0; i < arr.length; i++) {
            exists = shadow.arr.indexOf(arr[i]);
            if (exists === -1) {
                if (shadow.template) {
                    shadow.template(arr[i], shadow.el);
                }
                if (arr.render_append) {
                    arr.render_append(shadow.el, arr[i]);
                }
            }
        }

        shadow.arr = arr.slice();

        for (i = 0; i < arr.length; i++) {
            if (arr[i].$t) arr[i].$t.update();
        }

        if (arr.render_positions) {
            arr.render_positions();
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
};

RWTemplateHelpers.elem_update = function(elem, val) {
    "use strict";
    if (typeof(val) == "undefined") return;
    var elem_val = val;
    if (elem.getAttribute("helper")) {
        var hname = elem.getAttribute("helper");
        if (!RWTemplateHelpers[hname]) {
            throw("Helper " + hname + " doesn't exist.");
        }
        elem_val = RWTemplateHelpers[hname](val);
    }
    var tagname = elem.tagName.toLowerCase();
    if (tagname == "select") {
        elem.value = val;
    }
    else if (tagname == "input") {
        if ((elem.getAttribute("type") == "radio") || (elem.getAttribute("type") == "checkbox")) {
            if (elem.getAttribute("value") == elem_val) {
                elem.checked = true;
            }
            else {
                elem.checked = false;
            }
        }
        else {
            elem.value = elem_val;
        }
    }
    else if (tagname == "textarea") {
        elem.value = elem_val;
    }
    else if (tagname == "img") {
        elem.setAttribute("src", elem_val);
    }
    else {
        elem.textContent = elem_val || "";
    }
};

RWTemplateHelpers.change_button_text = function(btn, text) {
    if (!btn._changed) {
        btn._changed = true;
        btn.style.minWidth = btn.offsetWidth + "px";
        btn._original_html = btn.innerHTML;
    }
    if (!text && btn._original_html) {
        btn.innerHTML = btn._original_html;
    }
    else if (text) {
        btn.textContent = text;
    }
};

RWTemplateHelpers.stop_ie8_propagation = function(e) {
    e = e || window.event;
    e.cancelBubble = true;
    e.returnValue = false;
    if ( e.stopPropagation ) e.stopPropagation();
    if ( e.preventDefault ) e.preventDefault();
    return e;
};

RWTemplateHelpers.on_form_render = function(_c, form) {
    if (!_c.$t) return;
    form.onsubmit = function(e) {
        e = RWTemplateHelpers.stop_ie8_propagation(e);
        if (_c.$t && _c.$t.on_submit) {
            _c.$t.on_submit(e, _c, form);
        }
        return false;
    };
};
RWTemplateHelpers._ofr = RWTemplateHelpers.on_form_render;

(function() {
    "use strict";

    var btn_success = "btn-success";
    var btn_error = "btn-danger";
    var btn_normal = "btn-primary";
    var error_class = "has-error";

    var bootstrap_mode = true;

    RWTemplateHelpers.remove_error_class = function(elem) {
        elem = elem.classList ? elem : this;
        if (!elem.classList) return;
        if (elem.classList.contains(error_class)) {
            elem.classList.remove(btn_error);
        }
        if (bootstrap_mode && !elem.classList.contains("form-group")) {
            while (elem.parentNode && elem.parentNode.classList) {
                if (elem.parentNode.classList.contains("form-group")) {
                    elem.parentNode.classList.remove(error_class);
                    break;
                }
                elem = elem.parentNode;
            }
        }
    };
    RWTemplateHelpers._rec = function(elem) {
        elem.addEventListener("focus", RWTemplateHelpers.remove_error_class);
    };

    RWTemplateHelpers.add_error_class = function(elem) {
        elem = elem.classList ? elem : this;
        if (!elem.classList) return;
        if (elem.classList.contains(error_class)) {
            elem.classList.remove(error_class);
        }
        if (bootstrap_mode && !elem.classList.contains("form-group")) {
            while (elem.parentNode && elem.parentNode.classList) {
                if (elem.parentNode.classList.contains("form-group")) {
                    elem.parentNode.classList.add(error_class);
                    break;
                }
                elem = elem.parentNode;
            }
        }
    };

    RWTemplateHelpers.change_button_class = function(btn, new_class) {
        btn.classList.remove(btn_success);
        btn.classList.remove(btn_error);
        btn.classList.remove(btn_normal);
        btn.classList.add(new_class);
    };

    var gettext = gettext || function(txt) { return txt; };

    RWTemplateObject.prototype.update = function(from_object) {
        var val;
        from_object = from_object || this._c;
        for (var i in from_object) {
            if (!from_object.hasOwnProperty(i)) continue;
            if (i.charAt(0) == "$") continue;

            val = from_object[i];
            if (Object.prototype.toString.call(val) == "[object Array]") {
                RWTemplateHelpers.array_update(val);
            }
            else if ((Object.prototype.toString.call(val) == "[object Object]") && val.$t) {
                val.$t.update();
            }
            else if (typeof(this[i]) == "function") {
                this[i](val);
            }
            else if (typeof(this[i]) == "object") {
                for (var eli = 0; eli < this[i].length; eli++) {
                    RWTemplateHelpers.elem_update(this[i][eli], val);
                }
            }
        }
    };

    RWTemplateObject.prototype.get = function(update_in_place) {
        var new_obj = {};
        var arr_i;
        for (var i in this._c) {
            if (!this._c.hasOwnProperty(i)) continue;
            if (i.charAt(0) == "$") continue;

            if ((this._c[i] !== null) && this._c[i].$t && this._c[i].$t.get) {
                new_obj[i] = this._c[i].$t.get(update_in_place);
            }
            else if (Object.prototype.toString.call(this._c[i]) == "[object Array]") {
                new_obj[i] = [];
                for (arr_i = 0; arr_i < this._c[i].length; arr_i++) {
                    if (this._c[i][arr_i] && this._c[i][arr_i].$t && this._c[i][arr_i].$t.get) {
                        new_obj[i].push(this._c[i][arr_i].$t.get(update_in_place));
                    }
                }
            }
            else if (this[i]) {
                var elem, tagname, new_val;
                for (var eli = 0; eli < this[i].length; eli++) {
                    new_val = undefined;
                    elem = this[i][eli];
                    tagname = elem.nodeType && elem.tagName ? elem.tagName.toLowerCase() : null;
                    if (tagname == "select") {
                        new_val = elem.value;
                    }
                    else if ((tagname == "input") && (elem.getAttribute("type") == "radio") && elem.checked) {
                        new_val = elem.value;
                    }
                    else if ((tagname == "input") && (elem.getAttribute("type") == "checkbox") && elem.checked) {
                        if (elem.value && (elem.value != "true")) {
                            if (!new_obj[i]) new_val = "";
                            if (new_obj[i].length > 0) new_val += "|";
                            new_val += elem.value || "true";
                        }
                        else {
                            new_val = true;
                        }
                    }
                    else if ((elem.getAttribute("type") != "submit") && (typeof(elem.value) != "undefined")) {
                        new_val = elem.value;
                    }

                    if ((typeof(new_val) != "undefined") && elem.getAttribute("helper")) {
                        if (typeof(RWTemplateHelpers[elem.getAttribute("helper") + "_get"]) == "function") {
                            new_val = RWTemplateHelpers[elem.getAttribute("helper") + "_get"](this._c, new_val);
                        }
                        else {
                            console.warn("Helper " + elem.getAttribute("helper") + " has a setter but no getter.  Define RWTemplateHelpers." + elem.getAttribute("helper") + "_get.");
                        }
                    }

                    if (typeof(new_val) != "undefined") {
                        if (!isNaN(new_val) && !isNaN(parseFloat(new_val))) {
                            new_val = parseFloat(new_val);
                        }
                        if ((typeof(new_obj[i]) == "undefined") || (new_val != this._c[i])) {
                            new_obj[i] = new_val;
                        }
                    }
                }
            }
        }

        if (update_in_place) {
            for (i in new_obj) {
                this._c[i] = new_obj[i];
            }
        }
        return new_obj;
    };

    RWTemplateObject.prototype.update_data = function() {
        this.get(true);
    };

    RWTemplateObject.prototype.update_in_place = function() {
        var new_obj = this.get(true);
        this.update(new_obj);
    };

    RWTemplateObject.prototype.reset = RWTemplateObject.prototype.update;

    var allowed_tags = [ "select", "button", "textarea", "input" ];

    RWTemplateObject.prototype.get_form_elements = function() {
        var elements = [];
        var i, j;
        for (i in this) {
            if (!this.hasOwnProperty(i)) continue;
            if (i.charAt(0) == "$") continue;
            for (j = 0; j < this[i].length; j++) {
                if (allowed_tags.indexOf(this[i][j].tagName.toLowerCase()) !== -1) {
                    elements.push(this[i][j]);
                }
            }
        }
        for (i in this._c) {
            if (!this._c.hasOwnProperty(i)) continue;
            if (i.charAt(0) == "$") continue;
            if (!this._c[i]) continue;

            if (typeof(this._c[i].$t) != "undefined") {
                elements = elements.concat(this._c[i].$t.get_form_elements());
            }
            else if (Object.prototype.toString.call(this._c[i]) == "[object Array]") {
                for (j = 0; j < this._c[i].length; j++) {
                    if (typeof(this._c[i][j].$t) != "undefined") {
                        elements = elements.concat(this._c[i][j].$t.get_form_elements());
                    }
                }
            }
        }
        return elements;
    };

    RWTemplateObject.prototype.clear = function() {
        var elements = this.get_form_elements();
        for (var i = 0; i < elements.length; i++) {
            elements[i].value = null;
        }
    };

    RWTemplateObject.prototype.submitting = function(submit_message, no_disable) {
        var elements = this.get_form_elements();
        for (var i = 0; i < elements.length; i++) {
            if (this._c.hasOwnProperty(i)) RWTemplateHelpers.remove_error_class(elements[i]);
            if (elements[i].getAttribute("type") === "submit") {
                RWTemplateHelpers.change_button_text(elements[i], submit_message || gettext("Saving..."));
                if (!no_disable) {
                    RWTemplateHelpers.change_button_class(elements[i], btn_normal);
                }
            }
            if (!no_disable) {
                elements[i].disabled = true;
                elements[i].classList.add("disabled");
            }
        }
    };

    var tracking_errors = {};

    RWTemplateObject.prototype.error = function(rest_error, xhr_object, error_message) {
        if (xhr_object) {
            if (xhr_object.status === 403) {
                error_message = gettext("Invalid Permissions");
            }
            else if ((xhr_object.status % 300) < 100) {
                error_message = gettext("Server Error (300)");
            }
            else if ((xhr_object.status % 500) < 100) {
                error_message = gettext("Server Error (500)");
            }
        }
        error_message = error_message || gettext("Try Again");

        var elements = this.get_form_elements();
        var submit_btn;
        for (var i = 0; i < elements.length; i++) {
            if (this._c.hasOwnProperty(i)) RWTemplateHelpers.remove_error_class(elements[i]);
            elements[i].disabled = false;
            elements[i].classList.remove("disabled");
            if (elements[i].getAttribute("type") == "submit") {
                submit_btn = elements[i];
            }
        }

        if (submit_btn) {
            RWTemplateHelpers.change_button_text(submit_btn, error_message);
            RWTemplateHelpers.change_button_class(submit_btn, btn_error);

            tracking_errors[submit_btn] = function() {
                RWTemplateHelpers.change_button_text(submit_btn);
                RWTemplateHelpers.change_button_class(submit_btn, btn_normal);

                for (i = 0; i < elements.length; i++) {
                    elements[i].removeEventListener("focus", tracking_errors[submit_btn]);
                }
                tracking_errors[submit_btn] = null;
            };

            for (i = 0; i < elements.length; i++) {
                elements[i].addEventListener("focus", tracking_errors[submit_btn]);
            }
        }

        if (rest_error) {
            var eli;
            for (i in rest_error) {
                if (this.hasOwnProperty(i)) {
                    for (eli = 0; eli < this[i].length; eli++) {
                        RWTemplateHelpers.add_error_class(this[i][eli]);
                    }
                }
            }
        }
    };

    RWTemplateObject.prototype.normal = function(submit_button_text) {
        var elements = this.get_form_elements();
        for (var i = 0; i < elements.length; i++) {
            if (bootstrap_mode && elements[i].parentNode) {
                elements[i].parentNode.classList.remove("has-error");
            }
            elements[i].disabled = false;
            elements[i].classList.remove("disabled");
            if (elements[i].getAttribute("type") == "submit") {
                RWTemplateHelpers.change_button_text(elements[i], submit_button_text);
                RWTemplateHelpers.change_button_class(elements[i], btn_normal);
            }
        }
    };

    RWTemplateObject.prototype.success = function(success_message, permanent) {
        var elements = this.get_form_elements();
        var this_obj, normalize;
        if (!permanent) {
            this_obj = this;
            normalize = function() { this_obj.normal(); };
        }
        for (var i = 0; i < elements.length; i++) {
            elements[i].disabled = permanent;
            elements[i].classList[permanent ? "add" : "remove"]("disabled");
            if (bootstrap_mode && elements[i].parentNode) {
                elements[i].parentNode.classList.remove("has-error");
            }
            if (elements[i].getAttribute("type") == "submit") {
                this.normal();
                RWTemplateHelpers.change_button_text(elements[i], success_message || gettext("Success!"));
                RWTemplateHelpers.change_button_class(elements[i], btn_success);
                if (!permanent) {
                    setTimeout(normalize, 5000);
                }
            }
        }
    };

    /*RWTemplateObject.prototype.enable_enter_key_submission = function(func) {
        var elements = this.get_form_elements();
        var tagname;
        var submit_func = function(e) { if (e.keyCode == 13) func(); };
        for (var i = 0; i < elements.length; i++) {
            tagname = elements[i].tagName.toLowerCase();
            if ((tagname == "select") || (tagname == "input")) {
                elements[i].addEventListener("keypress", submit_func);
            }
        }
    };*/
}());
