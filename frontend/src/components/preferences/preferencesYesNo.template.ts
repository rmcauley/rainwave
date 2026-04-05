import { $l } from '../../language';

import type { settingsYesNoContext } from './preferencesYesNo.context';

import style from './settingsYesNo.module.scss';

function settingsYesNo(context: settingsYesNoContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.setAttribute(
    'data-old-class',
    'setting-group yes-no-group' +
      (context.special ? 'setting-group-special' : '') +
      ' ' +
      (context.power_only ? 'power-only' : ''),
  );
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.className = style['yes-no-wrapper unselectable'];
  v2.appendChild(v3);

  const v4 = document.createElement('span');
  v4.appendChild(document.createTextNode($l('yes')));
  v4.className = style['yes-no-yes'];
  v3.appendChild(v4);

  const v5 = document.createElement('span');
  v5.className = style['yes-no-bar'];
  v3.appendChild(v5);

  const v6 = document.createElement('span');
  v6.className = style['yes-no-dot'];
  v3.appendChild(v6);

  const v7 = document.createElement('span');
  v7.appendChild(document.createTextNode($l('no')));
  v7.className = style['yes-no-no'];
  v3.appendChild(v7);

  const v8 = document.createElement('label');
  v8.appendChild(document.createTextNode(context.name));
  v2.appendChild(v8);

  return { $root: v1, item_root: v2, wrap: v3, yes: v4, no: v7, name: v8 };
}
export { settingsYesNo };
