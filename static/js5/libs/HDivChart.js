function HDivChart(data) {
    "use strict";

    var total = 0;
    for (var i = 0; i < data.length; i++) {
        total += data[i].count;
    }
    var total_percent = 0;
    for (i = 0; i < data.length; i++) {
        data[i].share = Math.floor(data[i].count / total * 100);
        total_percent += data[i].share;
    }
    // fudge things
    if (total_percent < 100) {
        data[0].share += 100 - total_percent;
    }

    var outside = document.createElement("div");
    outside.className = "chart_outside";
    var d, t;
    for (i = 0; i < data.length; i++) {
        d = document.createElement("div");
        d.className = "chart_bar";
        d.style.width = data[i].share + "%";
        d.style.backgroundColor = data[i].color;
        d.style.left = (i * Math.floor(100 / data.length)) + "%";
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
