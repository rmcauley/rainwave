import type { faveContext } from './fave.context';

import style from './fave.module.scss';

function fave(context: faveContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style.fave;
  v1.appendChild(v2);

  const v3 = document.createElement('img');
  v3.className = style['fave-lined'];
  v3.setAttribute('src', `/static/images4/heart_lined.png`);
  v2.appendChild(v3);

  const v4 = document.createElement('img');
  v4.className = style['fave-solid'];
  v4.setAttribute('src', `/static/images4/heart_solid_gold.png`);
  v2.appendChild(v4);

  return { $root: v1, fave: v2 };
}
export { fave };
