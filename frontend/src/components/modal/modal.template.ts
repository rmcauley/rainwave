import { svgIcon as _svg } from '../../helpers/svg';
import type { modalContext } from './modal.context';
function modalTemplate(context: modalContext) {
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
  const v5 = _svg('#rw-icon-close');
  v5.setAttribute('class', `rw-icon-close`);
  v5.setAttribute('viewbox', `0 0 100 100`);
  v4.appendChild(v5);
  if (context.title) {
    const v6 = document.createElement('span');
    v6.appendChild(document.createTextNode(context.title));
    v4.appendChild(v6);
  }
  const v7 = document.createElement('div');
  v7.className = 'modal-body';
  v1.appendChild(v7);
  const v8 = document.createElement('div');
  v8.className = 'modal-footer';
  v1.appendChild(v8);
  return { $root: v1, modal: v1, closeIcon: v5, body: v7 };
}
export { modalTemplate };
