import type { ratingContext } from './rating.context';

import style from './rating.module.scss';

function rating(context: ratingContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style.rating;
  v1.appendChild(v2);
  if (User.id > 1 || context.rating_user) {
    const v3 = document.createElement('div');
    v3.className = style['rating-number rating-hover'];
    v2.appendChild(v3);
  }
  
return { $root: v1, rating: v2, ratingHoverNumber: v3 };
}
export { rating };
