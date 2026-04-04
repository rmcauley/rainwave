import type { albumRatingContext } from './albumRating.context';

import style from './albumRating.module.scss';
function albumRating(context: albumRatingContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = style['rating album-rating'];
  v1.appendChild(v2);
  if (!Sizing.simple) {
    const v3 = document.createElement('div');
    v3.className = style['rating-number rating-hover'];
    v2.appendChild(v3);
  }
  
return { $root: v1, rating: v2, rating_hover_number: v3 };
}
export { albumRating };
