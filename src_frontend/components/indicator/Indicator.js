var Indicator = function (indicator, indicatorStartCount, indicator2) {
  var indicatorTimeout;
  var currentCount = indicatorStartCount;

  var blankIndicator = function () {
    indicatorTimeout = null;
    indicator.textContent = "";
    if (indicator2) {
      indicator2.textContent = "";
    }
  };

  var unindicate = function () {
    indicator.classList.remove("show");
    if (indicator2) {
      indicator2.classList.remove("show");
    }
    indicatorTimeout = setTimeout(blankIndicator, 300);
    indicatorStartCount = currentCount;
  };

  var indicate = function (newCount) {
    if (
      document.body.classList.contains("loading") ||
      (!indicatorTimeout && newCount == indicatorStartCount)
    ) {
      currentCount = newCount;
      indicatorStartCount = newCount;
      return;
    }
    if (indicatorTimeout) {
      clearTimeout(indicatorTimeout);
    }
    currentCount = newCount;
    newCount = newCount - indicatorStartCount;

    if (newCount > 0) {
      indicator.classList.add("positive");
      indicator.classList.remove("negative");
      indicator.classList.remove("equal");
      indicator.textContent = "+" + newCount;
      if (indicator2) {
        indicator2.textContent = "+" + newCount;
      }
    } else if (newCount < 0) {
      indicator.classList.remove("positive");
      indicator.classList.add("negative");
      indicator.classList.remove("equal");
      indicator.textContent = newCount;
      if (indicator2) {
        indicator2.textContent = newCount;
      }
    } else {
      indicator.textContent = "=";
      indicator.classList.remove("positive");
      indicator.classList.remove("negative");
      indicator.classList.add("equal");
      if (indicator2) {
        indicator2.textContent = "=";
      }
    }
    indicator.classList.add("show");
    if (indicator2) {
      indicator2.classList.add("show");
    }
    indicatorTimeout = setTimeout(unindicate, 2000);
  };

  return indicate;
};
