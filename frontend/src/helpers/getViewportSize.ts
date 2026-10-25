let viewportWidth = document.documentElement.clientWidth;
let viewportHeight = document.documentElement.clientHeight;

window.addEventListener('resize', () => {
  viewportWidth = document.documentElement.clientWidth;
  viewportHeight = document.documentElement.clientHeight;
});

function getViewportWidth(): number {
  return viewportWidth;
}

function getViewportHeight(): number {
  return viewportHeight;
}

export { getViewportWidth, getViewportHeight };
