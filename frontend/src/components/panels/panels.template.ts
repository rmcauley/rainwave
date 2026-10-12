import { svgIcon as _svg } from '../../helpers/svg';
import type { panelsContext } from './panels.context';

import style from './panels.scss';
function panelsTemplate(context: panelsContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.setAttribute('id', `panels`);
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.setAttribute('id', `panels-request`);
  v3.className = 'panel';
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.setAttribute('id', `panels-search`);
  v4.className = 'panel';
  v2.appendChild(v4);
  const v5 = document.createElement('div');
  v5.setAttribute('id', `panels-detail`);
  v5.className = 'panel';
  v2.appendChild(v5);
  const v6 = document.createElement('div');
  v6.setAttribute('id', `panels-detail-header`);
  v5.appendChild(v6);
  const v7 = document.createElement('div');
  v6.appendChild(v7);
  const v8 = _svg('#rw-icon-close');
  v8.setAttribute('class', `rw-icon-close`);
  v8.setAttribute('viewbox', `0 0 100 100`);
  v6.appendChild(v8);
  const v9 = document.createElement('div');
  v9.setAttribute('id', `panels-detail-body`);
  v5.appendChild(v9);
  return {
    $root: v1,
    requestPanel: v3,
    searchPanel: v4,
    detailPanel: v5,
    header: v7,
    closeIcon: v8,
    body: v9,
  };
}
export { panelsTemplate };
