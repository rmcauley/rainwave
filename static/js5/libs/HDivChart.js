function HDivChart(data, options) {
    "use strict";

    var total, i;
    if (options && options.max) {
        total = options.max;
        console.log(total);
    }
    else {
        total = 0;
        for (i = 0; i < data.length; i++) {
            total += data[i].value;
        }
    }

    var total_percent = 0;
    for (i = 0; i < data.length; i++) {
        data[i].share = Math.floor(data[i].value / total * 100);
        total_percent += data[i].share;
    }
    // fudge things
    if (!options || !options.max) {
        if (total_percent < 100) {
            data[0].share += 100 - total_percent;
        }
    }

    var outside = document.createElement("div");
    outside.className = "chart_outside";
    var d, t, pos;
    pos = 0;
    for (i = 0; i < data.length; i++) {
        d = document.createElement("div");
        d.className = "chart_bar";
        d.style.width = data[i].share + "%";
        d.style.backgroundColor = data[i].color;
        d.style.left = pos + "%";
        pos += data[i].share;
        if (data[i].label) {
            t = document.createElement("span");
            t.className = "chart_label";
            t.textContent = data[i].label;
            d.appendChild(t);
        }
        if (data[i].tooltip) {
            t = document.createElement("span");
            t.className = "chart_tooltip";
            t.textContent = data[i].tooltip;
            d.appendChild(t);
        }
        if (data[i].title) {
            t = document.createElement("span");
            t.className = "chart_title";
            t.textContent = data[i].title;
            d.appendChild(t);
        }
        outside.appendChild(d);
    }

    return outside;
}
