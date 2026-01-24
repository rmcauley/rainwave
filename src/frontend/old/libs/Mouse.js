function getY(e) {
  return e.pageY
    ? e.pageY
    : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
}

let x = 0;
let y = 0;

if (!MOBILE) {
  var updateMouse = function (e) {
    x = e.pageX
      ? e.pageX
      : e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
    y = e.pageY
      ? e.pageY
      : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
  };

  // ONLY ON DOWN, not on move!
  // This is mostly used to track where the mouse is to help tooltip error displays
  window.addEventListener("mousedown", updateMouse, true);
}

export { getY, x, y };
