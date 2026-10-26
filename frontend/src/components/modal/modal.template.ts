import { svgIcon as _svg } from '../../helpers/svg';

import style from './modal.scss';
function modalTemplate() {
  const v1 = document.createElement('div');
  v1.className = 'modal';
  const v2 = document.createElement('div');
  v2.className = 'modal-header';
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = 'modal-header-bkg';
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = 'modal-header-content';
  v3.appendChild(v4);
  const v5 = document.createElement('div');
  v4.appendChild(v5);
  const v6 = _svg('#rw-icon-close');
  v6.setAttribute('class', `modal-close-icon`);
  v6.setAttribute('viewbox', `0 0 100 100`);
  v4.appendChild(v6);
  const v7 = document.createElement('div');
  v7.className = 'modal-body';
  v1.appendChild(v7);
  const v8 = document.createElement('div');
  v8.className = 'modal-footer';
  v1.appendChild(v8);
  return { $root: v1, modal: v1, title: v5, closeIcon: v6, body: v7 };
}
export { modalTemplate };
