import { $l } from '../language';

import { removeElement } from './fx';
import { requestNextAnimationFrame } from './request-next-animation-frame';

import type { RainwaveSchemas } from '../rainwaveApi/types';

function showTooltipError(json: RainwaveSchemas['error']): void {
  if (!json) {
    return;
  }
  const err = document.createElement('div');
  err.className = 'error-tooltip';
  err.textContent = json.text || $l(json.tl_key);

  let x = Mouse.x - 5;
  let y = Mouse.y - 40 - 2;
  if (y < 20) {
    y = 30;
  } else if (y > Sizing.height - 40) {
    y = Sizing.height - 40;
  }
  if (x < 30) {
    x = 40;
  } else if (x > Sizing.width - 40) {
    x = Sizing.width - 40;
  }
  err.style.left = x + 'px';
  err.style.top = y + 'px';

  document.body.appendChild(err);
  requestNextAnimationFrame(function () {
    err.style.opacity = '1';
  });
  setTimeout(function () {
    removeElement(err);
  }, 5000);
}
