let stopAll = false;
const blocker = document.createElement("div");
blocker.className = "modal_blocker";

function doClose(modalToClose) {
  if (
    modalToClose.classList.contains("modal_container") &&
    !modalToClose.classList.contains("modal_closing")
  ) {
    modalToClose.classList.add("modal_closing");
    setTimeout(function () {
      modalToClose.parentNode.removeChild(modalToClose);
    }, 300);
  }
}

function closeModal(e, chaining) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (stopAll) {
    return;
  }
  document.body.classList.remove("modal_active");
  var toClose = document.body.querySelectorAll("div.modal_container");
  for (var i = 0; i < toClose.length; i++) {
    doClose(toClose[i]);
  }
  if (!chaining) {
    blocker.classList.remove("active");
    setTimeout(function () {
      if (blocker.parentNode && !blocker.classList.contains("active")) {
        blocker.parentNode.removeChild(blocker);
      }
    }, 300);
  }
}

function modalClass(title, templateName, templateObject, noClose) {
  // catastrophic error has happened
  if (!document.body) {
    return;
  }
  closeModal(null, true);
  if (stopAll) {
    return;
  }
  if (noClose) {
    stopAll = true;
  }
  var mt = RWTemplates.modal({ closeable: !noClose, title: title });
  templateObject = templateObject || {};
  if (mt.close) {
    mt.close.addEventListener("click", closeModal);
  }
  var ct = RWTemplates[templateName](templateObject, mt.content);
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
}

blocker.addEventListener("click", closeModal);

export { modalClass, closeModal };
