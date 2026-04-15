import type { modalRatingContext } from './modalRating.context';

function modalRating(context: modalRatingContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.appendChild(document.createTextNode(`5.0`));
  v2.setAttribute('id', `rating_window_5_0`);
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.appendChild(document.createTextNode(`4.5`));
  v3.setAttribute('id', `rating_window_4_5`);
  v1.appendChild(v3);

  const v4 = document.createElement('div');
  v4.appendChild(document.createTextNode(`4.0`));
  v4.setAttribute('id', `rating_window_4_0`);
  v1.appendChild(v4);

  const v5 = document.createElement('div');
  v5.appendChild(document.createTextNode(`3.5`));
  v5.setAttribute('id', `rating_window_3_5`);
  v1.appendChild(v5);

  const v6 = document.createElement('div');
  v6.appendChild(document.createTextNode(`3.0`));
  v6.setAttribute('id', `rating_window_3_0`);
  v1.appendChild(v6);

  const v7 = document.createElement('div');
  v7.appendChild(document.createTextNode(`2.5`));
  v7.setAttribute('id', `rating_window_2_5`);
  v1.appendChild(v7);

  const v8 = document.createElement('div');
  v8.appendChild(document.createTextNode(`2.0`));
  v8.setAttribute('id', `rating_window_2_0`);
  v1.appendChild(v8);

  const v9 = document.createElement('div');
  v9.appendChild(document.createTextNode(`1.5`));
  v9.setAttribute('id', `rating_window_1_5`);
  v1.appendChild(v9);

  const v10 = document.createElement('div');
  v10.appendChild(document.createTextNode(`1.0`));
  v10.setAttribute('id', `rating_window_1_0`);
  v1.appendChild(v10);

  return { $root: v1 };
}
export { modalRating };
