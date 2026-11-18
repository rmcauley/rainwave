import { removeElement } from '../../helpers/removeElement';
import { getViewportHeight, getViewportWidth } from '../../helpers/viewportSizeAndLayout';
import { $l } from '../../language';
import type { RainwaveTranslationKey } from '../../language/translations';

function getErrorText(payload: unknown, fallback = 'Unknown error'): string {
  if (payload && typeof payload === 'string') {
    return payload;
  } else if (payload && typeof payload === 'object') {
    if ('text' in payload && typeof payload.text === 'string') {
      return payload.text;
    } else if ('tl_key' in payload && typeof payload.tl_key === 'string') {
      return $l(payload.tl_key as RainwaveTranslationKey);
    } else if (payload instanceof Error) {
      return `${payload.name} ${payload.message}`;
    }
  }
  return fallback;
}

function showErrorTooltip(payload: unknown, atElement: HTMLElement): void {
  const text = getErrorText(payload);
  const tooltip = document.createElement('div');
  tooltip.className = 'error-tooltip';
  tooltip.textContent = text;

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

export { showErrorTooltip, getErrorText };
