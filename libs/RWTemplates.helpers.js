RWTemplates.helpers = {};

RWTemplates.helpers.array_item_delete = function(container_el, deleted_array_item) {
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

RWTemplates.helpers.array_render = function(arr, template, el) {
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

RWTemplates.helpers.array_update = function(arr) {
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
                (shadow.render_delete || arr.render_delete || RWTemplates.helpers.array_item_delete)(shadow.el, shadow.arr[i]);
            }
        }

        // find things that don't exist yet
        for (i = 0; i < arr.length; i++) {
            exists = shadow.arr.indexOf(arr[i]);
            if (exists === -1) {
                shadow.template(arr[i], shadow.el);
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
        else {
            console.warn("Array can't be updated with correct HTML sorting - make sure your array item templates have bind='item_root' to enable automatic HTML element position sorting.");
        }
    }
};

RWTemplates.helpers.elem_update = function(elem, val) {
    if (!elem || (typeof(val) == "undefined")) return;
    elem_val = val;
    if (elem.getAttribute("helper")) {
        var hname = elem.getAttribute("helper");
        if (!RWTemplates.helpers[hname]) {
            throw("Helper " + hname + " doesn't exist.");
        }
        elem_val = RWTemplates.helpers[hname](val);
    }
    tagname = elem.tagName.toLowerCase();
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

var RWTemplateObject = function(_c) {
    "use strict";
    this._c = _c;
};

(function() {
    "use strict";
    var change_button_text = function(btn, text) {
        if (!btn._changed) {
            btn._changed = true;
            btn._original_html = btn.innerHTML;
        }
        if (!text && btn._original_html) {
            btn.innerHTML = btn._original_html;
        }
        else if (text) {
            btn.textContent = text;
        }
    };

    var btn_success = "btn-success";
    var btn_error = "btn-danger";
    var btn_normal = "btn-primary";

    var bootstrap_mode = true;

    var change_button_class = function(btn, new_class) {
        btn.classList.remove(btn_success);
        btn.classList.remove(btn_error);
        btn.classList.remove(btn_normal);
        btn.classList.add(new_class);
    };

    var gettext = gettext || function(txt) { return txt; };

    RWTemplateObject.prototype.update = function() {
        var val;
        for (var i in this._c) {
            if (!this._c.hasOwnProperty(i)) continue;

            val = this._c[i];
            if (Object.prototype.toString.call(val) == "[object Array]") {
                RWTemplates.helpers.array_update(val);
            }
            else if ((Object.prototype.toString.call(val) == "[object Object]") && val.$t) {
                val.$t.update();
            }
            else if (typeof(this[i]) == "function") {
                this[i](val);
            }
            else if (typeof(this[i]) == "object") {
                var elem, tagname, elem_val;
                for (var eli = 0; eli < this[i].length; eli++) {
                    RWTemplates.helpers.elem_update(this[i][eli], val);
                }
            }
        }
    };

    RWTemplateObject.prototype.get = function(update_in_place) {
        var new_obj = {};
        var arr_i;
        for (var i in this._c) {
            if (!this._c.hasOwnProperty(i)) continue;
            if (i == "$t") continue;

            if (this._c[i].$t && this._c[i].$t.get) {
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
                var elem, tagname;
                for (var eli = 0; eli < this[i].length; eli++) {
                    elem = this[i][eli];
                    tagname = elem.nodeType && elem.tagName ? elem.tagName.toLowerCase() : null;
                    if (tagname == "select") {
                        new_obj[i] = elem.value;
                    }
                    else if ((tagname == "input") && (elem.getAttribute("type") == "radio") && elem.checked) {
                        new_obj[i] = elem.value;
                    }
                    else if ((tagname == "input") && (elem.getAttribute("type") == "checkbox") && elem.checked) {
                        if (elem.value && (elem.value != "true")) {
                            if (!new_obj[i]) new_obj[i] = "";
                            if (new_obj[i].length > 0) new_obj[i] += "|";
                            new_obj[i] += elem.value || "true";
                        }
                        else {
                            new_obj[i] = true;
                        }
                    }
                    else if ((elem.getAttribute("type") != "submit") && (typeof(elem.value) != "undefined")) {
                        new_obj[i] = elem.value;
                    }

                    if (new_obj[i] && elem.getAttribute("helper")) {
                        if (typeof(RWTemplates.helpers[elem.getAttribute("helper") + "_get"]) == "function") {
                            new_obj[i] = RWTemplates.helpers[elem.getAttribute("helper") + "_get"](this._c, new_obj[i]);
                        }
                        else {
                            console.warn("RWTemplates helper " + elem.getAttribute("helper") + " has a setter but no getter.  Add a " + elem.getAttribute("helper") + "_get function to RWTemplates.helpers.");
                        }
                    }

                    if (new_obj[i] && !isNaN(new_obj[i])) {
                        new_obj[i] = parseFloat(new_obj[i]);
                    }

                    if ((typeof(new_obj[i]) != "undefined") && update_in_place) {
                        this._c[i] = new_obj[i];
                    }
                }
            }
        }
        return new_obj;
    };

    RWTemplateObject.prototype.update_data = function(new_data) {
        this.get(true);
    };

    RWTemplateObject.prototype.reset = RWTemplateObject.prototype.update;

    var allowed_tags = [ 'select', 'button', 'textarea', 'input' ];

    RWTemplateObject.prototype.get_form_elements = function() {
        var elements = [];
        var i, j;
        for (i in this) {
            if (!this.hasOwnProperty(i)) continue;
            for (j = 0; j < this[i].length; j++) {
                if (allowed_tags.indexOf(this[i][j].tagName.toLowerCase()) !== -1) {
                    elements.push(this[i][j]);
                }
            }
        }
        for (i in this._c) {
            if (!this._c.hasOwnProperty(i)) continue;
            if (typeof(this._c[i].$t) != "undefined") {
                elements = elements.concat(this._c[i].$t.get_form_elements());
            }
            if (Object.prototype.toString.call(this._c[i]) == "[object Array]") {
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

    RWTemplateObject.prototype.submitting = function(submit_message) {
        var elements = this.get_form_elements();
        for (var i = 0; i < elements.length; i++) {
            if (elements[i].parentNode) {
                elements[i].parentNode.classList.remove("has-error");
            }
            if (elements[i].getAttribute("type") === "submit") {
                change_button_class(elements[i], btn_normal);
                change_button_text(elements[i], submit_message || gettext("Saving..."));
            }
            if (bootstrap_mode) {
                elements[i].classList.remove("has-error");
            }
            elements[i].disabled = true;
            elements[i].classList.add("disabled");
        }
    };

    var tracking_errors = {};

    RWTemplateObject.prototype.error = function(rest_error, xhr_object, error_message) {
        if (xhr_object) {
            if (xhr_object.status === 403) {
                error_message = gettext("Invalid Permissions");
            }
            else if ((xhr_object.status % 300) < 100) {
                error_message = gettext("Server Error - Please Try Later");
            }
            else if ((xhr_object.status % 500) < 100) {
                error_message = gettext("Server Error - Please Try Later");
            }
        }
        error_message = error_message || gettext("Try Again");
        var elements = this.get_form_elements();
        var submit_btn;
        for (var i = 0; i < elements.length; i++) {
            if (bootstrap_mode) {
                if (elements[i].parentNode) {
                    elements[i].parentNode.classList.remove("has-error");
                }
            }
            elements[i].disabled = false;
            elements[i].classList.remove("disabled");
            if (elements[i].getAttribute("type") == "submit") {
                submit_btn = elements[i];
            }
        }
        if (submit_btn) {
            change_button_class(submit_btn, btn_error);
            change_button_text(submit_btn, error_message);

            tracking_errors[submit_btn] = function() {
                change_button_class(submit_btn, btn_normal);
                change_button_text(elements[i]);

                for (i = 0; i < elements.length; i++) {
                    elements[i].removeEventListener("focus", tracking_errors[submit_btn]);
                }
                tracking_errors[submit_btn] = null;
            };

            for (i = 0; i < elements.length; i++) {
                elements[i].addEventListener("focus", tracking_errors[submit_btn]);
            }
        }

        if (rest_error && bootstrap_mode) {
            for (i in rest_error) {
                if (this[i] && this[i].classList.contains("form-control") && this[i].parentNode) {
                    this[i].parentNode.classList.add("has-error");
                }
                else if (this[i]) {
                    this[i].classList.add("has-error");
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
                change_button_class(elements[i], btn_normal);
                change_button_text(elements[i], submit_button_text);
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
        var btns = [];
        for (var i = 0; i < elements.length; i++) {
            elements[i].disabled = permanent;
            elements[i].classList[permanent ? "add" : "remove"]("disabled");
            if (bootstrap_mode && elements[i].parentNode) {
                elements[i].parentNode.classList.remove("has-error");
            }
            if (elements[i].getAttribute("type") == "submit") {
                change_button_class(elements[i], btn_success);
                change_button_text(elements[i], success_message || gettext("Success!"));
                if (!permanent) {
                    setTimeout(normalize, 5000);
                }
            }
        }
    };

    RWTemplateObject.prototype.enable_enter_key_submission = function(func) {
        var elements = this.get_form_elements();
        var tagname;
        var submit_func = function(e) { if (e.keyCode == 13) func(); };
        for (var i = 0; i < elements.length; i++) {
            tagname = elements[i].tagName.toLowerCase();
            if ((tagname == "select") || (tagname == "input")) {
                elements[i].addEventListener("keypress", submit_func);
            }
        }
    };
}());
