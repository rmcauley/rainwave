function HDivChart(data, options) {
  options = options || {};
  options.minShare = options.minShare || 0;

  var total, i;
  if (options.max) {
    total = options.max;
  } else {
    total = 0;
    for (i = 0; i < data.length; i++) {
      total += data[i].value;
    }
  }

  var totalPercent = 0;
  for (i = 0; i < data.length; i++) {
    data[i].share = Math.floor((data[i].value / total) * 100);
    data[i].shareAccurate = Math.round((data[i].value / total) * 100);
    totalPercent += data[i].share;
  }

  if (data.length > 1) {
    for (i = 0; i < data.length && totalPercent < 100; i++) {
      data[i].share += 1;
      totalPercent += 1;
    }
  }

  if (options.addShareToLabel) {
    for (i = 0; i < data.length; i++) {
      data[i].label += data[i].share + "%";
    }
  }

  if (options.addShareToTooltip) {
    for (i = 0; i < data.length; i++) {
      data[i].tooltip += " (" + data[i].shareAccurate + "%)";
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
    if (
      data[i].label &&
      data[i].share >= options.minShare &&
      (!options.guideLines || data.length !== 1)
    ) {
      t = document.createElement("span");
      t.className = "chart_label";
      t.textContent = data[i].label;
      d.appendChild(t);
    }
    if (data[i].tooltip) {
      t = document.createElement("span");
      if (pos <= 15) {
        t.className = "chart_tooltip chart_tooltip_left";
      } else if (pos >= 85) {
        t.className = "chart_tooltip chart_tooltip_right";
      } else {
        t.className = "chart_tooltip";
      }
      t.textContent = data[i].tooltip;
      d.appendChild(t);
    }
    pos += data[i].share;
    outside.appendChild(d);
  }

  if (options.guideLines) {
    for (i = 1; i < options.guideLines; i++) {
      d = document.createElement("div");
      d.className = "chart_pip";
      d.style.left = Math.round(100 / options.guideLines) * i + "%";
      outside.appendChild(d);
    }

    if (data.length === 1) {
      t = document.createElement("span");
      t.className = "chart_label";
      t.textContent = data[0].label;
      outside.appendChild(t);
    }
  }

  return outside;
}

export { HDivChart };
