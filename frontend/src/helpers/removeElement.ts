function removeElement(el: HTMLElement, timeout: number = 1000): void {
  if (document.body.classList.contains('loading')) {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  } else {
    setTimeout(function () {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, timeout);
    requestAnimationFrame(function () {
      el.style.opacity = '0';
    });
  }
}

export { removeElement };
