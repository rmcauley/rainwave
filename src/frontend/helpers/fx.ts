import { requestNextAnimationFrame } from './request-next-animation-frame';

function removeElement(el: HTMLElement): void {
  if (document.body.classList.contains('loading')) {
    if (el.parentNode) {
      el.parentNode.removeChild(el);
    }
  } else {
    setTimeout(function () {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
    }, 1000);
    requestNextAnimationFrame(function () {
      el.style.opacity = '0';
    });
  }
}

export { removeElement };
