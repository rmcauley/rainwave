RWTemplateHelpers.tabify = function(obj, default_tab) {
    "use strict";

    if (!obj.$t) return;
    var areas = [];
    var tabs = [];
    var hide_areas = function() {
        for (var i = 0; i < areas.length; i++) {
            areas[i].classList.add("tab_invisible");
        }
        for (i = 0; i < tabs.length; i++) {
            tabs[i].parentNode.classList.remove("active");
        }
    };
    var tab_open = function() {
        hide_areas();
        this.parentNode.classList.add("active");
        if (obj.$t[this._tab_name + "_area"] && obj.$t[this._tab_name + "_area"][0]) {
            obj.$t[this._tab_name + "_area"][0].classList.remove("tab_invisible");
        }
        else {
            throw("Can't find corresponding area for " + this._tab_name + ".  Make sure you have a " + this._tab_name + "_area bound.");
        }
    };
    for (var i in obj.$t) {
        if ((i.indexOf("_area") !== -1) && (i.indexOf("_area") == (i.length - 5))) {
            areas.push(obj.$t[i][0]);
            obj.$t[i][0].classList.add("tab_area");
            obj.$t[i][0].classList.add("tab_invisible");
        }
        else if ((i.indexOf("_tab") !== -1) && (i.indexOf("_tab") == (i.length - 4))) {
            tabs.push(obj.$t[i][0]);
            obj.$t[i][0]._tab_name = i.substr(0, i.indexOf("_tab"));
            obj.$t[i][0]._open = tab_open;
            obj.$t[i][0].addEventListener("click", obj.$t[i][0]._open);
        }
    }
    hide_areas();
    if (default_tab) {
        obj.$t[default_tab + "_area"][0].classList.remove("tab_invisible");
        obj.$t[default_tab + "_tab"][0].parentNode.classList.add("active");
    }
};
