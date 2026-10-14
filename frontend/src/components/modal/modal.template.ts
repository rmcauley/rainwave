import { svgIcon as _svg } from '../../helpers/svg';
import type { modalContext } from './modal.context';

import style from './modal.scss';
function modalTemplate(context: modalContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = 'modal';
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = 'modal-header';
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = 'modal-header-bkg';
  v3.appendChild(v4);
  const v5 = document.createElement('div');
  v5.className = 'modal-header-content';
  v4.appendChild(v5);
  const v6 = _svg('#rw-icon-close');
  v6.setAttribute('class', `rw-icon-close`);
  v6.setAttribute('viewbox', `0 0 100 100`);
  v5.appendChild(v6);
  if (context.title) {
    const v7 = document.createElement('span');
    v7.appendChild(document.createTextNode(context.title));
    v5.appendChild(v7);
  }
  const v8 = document.createElement('div');
  v8.className = 'modal-body';
  v2.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = 'modal-footer';
  v2.appendChild(v9);
  return { $root: v1, modal: v2, closeIcon: v6, body: v8 };
}
export { modalTemplate };
