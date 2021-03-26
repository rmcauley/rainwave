// https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
// Test via a getter in the options object to see if the passive property is accessed
var supportsPassiveEvents = false;
try {
  var opts = Object.defineProperty({}, "passive", {
    get: function () {
      supportsPassiveEvents = true;
    },
  });
  window.addEventListener("test", null, opts);
} catch (e) {}
