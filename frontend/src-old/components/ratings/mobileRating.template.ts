import type { mobileRatingContext } from './mobileRating.context';

import style from './mobileRating.module.scss';

function mobileRating(context: mobileRatingContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style['mobile-rating unselectable {{ extraclass }}'];
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.className = style['slide-number'];
  v2.appendChild(v3);

  const v4 = document.createElement('div');
  v4.className = style.slider;
  v2.appendChild(v4);

  return { $root: v1, el: v2, number: v3, slider: v4 };
}
export { mobileRating };
