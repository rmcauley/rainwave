var Modal = (function () {
  "use strict";

  var stop_all = false;

  var do_close = function (modal_to_close) {
    if (
      modal_to_close.classList.contains("modal_container") &&
      !modal_to_close.classList.contains("modal_closing")
    ) {
      modal_to_close.classList.add("modal_closing");
      setTimeout(function (e) {
        modal_to_close.parentNode.removeChild(modal_to_close);
      }, 300);
    }
  };

  var close_modal = function (e, chaining) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (stop_all) {
      return;
    }
    document.body.classList.remove("modal_active");
    var to_close = document.body.querySelectorAll("div.modal_container");
    for (var i = 0; i < to_close.length; i++) {
      do_close(to_close[i]);
    }
    if (!chaining) {
      blocker.classList.remove("active");
      setTimeout(function () {
        if (blocker.parentNode && !blocker.classList.contains("active")) {
          blocker.parentNode.removeChild(blocker);
        }
      }, 300);
    }
  };

  var modal_class = function (title, template_name, template_object, no_close) {
    // catastrophic error has happened
    if (!document.body) {
      return;
    }
    close_modal(null, true);
    if (stop_all) {
      return;
    }
    if (no_close) {
      stop_all = true;
    }
    var mt = RWTemplates.modal({ closeable: !no_close, title: title });
    template_object = template_object || {};
    if (mt.close) {
      mt.close.addEventListener("click", close_modal);
    }
    var ct = RWTemplates[template_name](template_object, mt.content);
    mt.container.addEventListener("click", function (e) {
      e.stopPropagation();
    });
    document.body.insertBefore(blocker, document.body.firstChild);
    document.body.insertBefore(mt.container, document.body.firstChild);
    document.body.classList.add("modal_active");
    requestNextAnimationFrame(function () {
      mt.container.classList.add("open");
      blocker.classList.add("active");
      setTimeout(function () {
        mt.container.classList.add("full_open");
      }, 300);
    });
    return ct;
  };

  var blocker = document.createElement("div");
  blocker.className = "modal_blocker";
  blocker.addEventListener("click", close_modal);

  return modal_class;
})();
