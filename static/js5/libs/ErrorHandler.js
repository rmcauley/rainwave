var ErrorHandler = (function () {
  "use strict";
  var self = {};
  var already_reported = false;

  self.onerror_handler = function (exception) {
    if (already_reported) return;
    already_reported = true;

    var template = Modal($l("crash_happened"), "modal_error", null, true);
    template._root.parentNode.classList.add("error");

    try {
      if (window.Sentry) {
        window.Sentry.captureException(exception);
      }
    } catch (e) {
      // don't complain, we've already crashed
    }
  };

  var redownload_m3u_message = function () {
    self.nonpermanent_error(self.make_error("redownload_m3u", 200));
  };

  BOOTSTRAP.on_init.push(function () {
    API.add_callback("station_offline", self.permanent_error);
    API.add_callback("redownload_m3u", redownload_m3u_message);
  });

  self.test_modal = function () {
    var template = Modal($l("crash_happened"), "modal_error", null, true);
    if (!template) return;
    template._root.parentNode.classList.add("error");
  };

  self.make_error = function (tl_key, code) {
    return { tl_key: tl_key, code: code, text: $l(tl_key) };
  };

  self.permanent_error = function (
    json,
    append_element,
    not_actually_permanent
  ) {
    var msg = Timeline.add_message(
      json.tl_key,
      $l(json.tl_key),
      !not_actually_permanent
    );
    if (!msg) {
      return;
    }
    if (append_element) {
      msg.$t.message.appendChild(append_element);
    }
    return msg;
  };

  self.nonpermanent_error = function (json, append_element) {
    self.permanent_error(json, append_element, true);
  };

  self.remove_permanent_error = function (tl_key) {
    Timeline.remove_message(tl_key);
  };

  self.tooltip_error = function (json) {
    if (!json) return;
    var err = document.createElement("div");
    err.className = "error_tooltip";
    err.textContent = json.text || $l(json.tl_key);

    var x = Mouse.x - 5;
    var y = Mouse.y - 40 - 2;
    if (y < 20) y = 30;
    else if (y > Sizing.height - 40) y = Sizing.height - 40;
    if (x < 30) x = 40;
    else if (x > Sizing.width - 40) x = Sizing.width - 40;
    err.style.left = x + "px";
    err.style.top = y + "px";

    document.body.appendChild(err);
    requestNextAnimationFrame(function () {
      err.style.opacity = "1";
    });
    setTimeout(function () {
      Fx.remove_element(err);
    }, 5000);
  };

  return self;
})();
