import { getViewportHeight, getViewportWidth } from '../../helpers/getViewportSize';
import { removeElement } from '../../helpers/removeElement';
import { $l } from '../../language';
import type { RainwaveSchemas } from '../../rainwaveApi/types';

function showErrorTooltip(payload: RainwaveSchemas['error'], atElement: HTMLElement): void {
  const tooltip = document.createElement('div');
  tooltip.className = 'error-tooltip';
  tooltip.textContent = payload.text || $l(payload.tl_key);

  let { x, y } = atElement.getBoundingClientRect();
  const viewportHeight = getViewportHeight();
  const viewportWidth = getViewportWidth();
  if (y < 20) {
    y = 30;
  } else if (y > viewportHeight - 40) {
    y = viewportHeight - 40;
  }
  if (x < 30) {
    x = 40;
  } else if (x > viewportWidth - 40) {
    x = viewportWidth - 40;
  }
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;

  document.body.appendChild(tooltip);

  requestAnimationFrame(function () {
    tooltip.className = 'error-tooltip--show';
  });
  setTimeout(function () {
    removeElement(tooltip);
  }, 5000);
}

export { showErrorTooltip };
