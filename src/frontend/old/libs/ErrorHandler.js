let alreadyReported = false;

function onerrorHandler(exception) {
  if (alreadyReported) return;
  alreadyReported = true;

  var template = Modal($l("crash_happened"), "modal_error", null, true);
  template._root.parentNode.classList.add("error");

  try {
    var submitObj = {
      name: exception.name,
      message: exception.message,
      lineNumber: exception.lineNumber || "(no line)",
      columnNumber: exception.columnNumber || "(no char number)",
      stack:
        exception.stack ||
        exception.backtrace ||
        exception.stacktrace ||
        "(no stack)",
      location: window.location.href,
      userAgent: navigator.userAgent,
      browserLanguage: navigator.language || navigator.userLanguage,
    };
    API.async_get(
      "error_report",
      submitObj,
      function () {
        template.sending_report.textContent = $l("report_sent");
        API.sync_stop();
      },
      function () {
        template.sending_report.textContent = $l("report_error");
        API.sync_stop();
      },
    );
  } catch (e) {
    // don't complain, we've already crashed
  }
}

function redownloadM3uMessage() {
  nonpermanentError(makeError("redownload_m3u", 200));
}

INIT_TASKS.on_init.push(function () {
  API.add_callback("station_offline", permanentError);
  API.add_callback("redownload_m3u", redownloadM3uMessage);
});

function testModal() {
  var template = Modal($l("crash_happened"), "modal_error", null, true);
  if (!template) return;
  template._root.parentNode.classList.add("error");
}

function makeError(tlKey, code) {
  return { tl_key: tlKey, code: code, text: $l(tlKey) };
}

function permanentError(json, appendElement, notActuallyPermanent) {
  var msg = Timeline.add_message(
    json.tl_key,
    $l(json.tl_key),
    !notActuallyPermanent,
  );
  if (!msg) {
    return;
  }
  if (appendElement) {
    msg.$t.message.appendChild(appendElement);
  }
  return msg;
}

function nonpermanentError(json, appendElement) {
  permanentError(json, appendElement, true);
}

function removePermanentError(tlKey) {
  Timeline.remove_message(tlKey);
}

function tooltipError(json) {
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
    Fx.removeElement(err);
  }, 5000);
}

export {
  onerrorHandler,
  testModal,
  makeError,
  permanentError,
  nonpermanentError,
  removePermanentError,
  tooltipError,
};
