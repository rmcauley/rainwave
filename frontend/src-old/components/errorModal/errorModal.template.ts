import { $l } from '../../language';

import type { errorModalContext } from './errorModal.context';

import style from './errorModal.module.scss';

function errorModal(context: errorModalContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('p');
  v2.appendChild(document.createTextNode($l('report_sending')));
  v1.appendChild(v2);

  const v3 = document.createElement('p');
  v1.appendChild(v3);

  const v4 = document.createElement('a');
  v4.appendChild(document.createTextNode($l('please_refresh')));
  v4.className = style['link obvious'];
  v4.setAttribute('onclick', `window.location.reload()`);
  v3.appendChild(v4);

  return { $root: v1, sendingReport: v2 };
}
export { errorModal };
