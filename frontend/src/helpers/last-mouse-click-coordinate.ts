let x: number = 0;
let y: number = 0;

function updateMouse(e: MouseEvent): void {
  x = e.pageX
    ? e.pageX
    : e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
  y = e.pageY ? e.pageY : e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
}

// ONLY ON DOWN, not on move!
// This is mostly used to track where the mouse is to help tooltip error displays
window.addEventListener('mousedown', updateMouse, { capture: true, passive: true });

export { x, y };
