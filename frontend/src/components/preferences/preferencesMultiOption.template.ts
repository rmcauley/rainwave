import type { settingsMultiOptionContext } from './preferencesMultiOption.context';

import style from './settingsMultiOption.module.scss';

function settingsMultiOption(context: settingsMultiOptionContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.setAttribute(
    'data-old-class',
    'setting-group ' +
      (context.special ? 'setting-group-special' : '') +
      ' ' +
      (context.power_only ? 'power-only' : ''),
  );
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.className = style['multi-select unselectable'];
  v2.appendChild(v3);

  const v4 = document.createElement('div');
  v4.className = style['floating-highlight'];
  v3.appendChild(v4);

  const v5 = context.legal_values.map((context) => {
    const v6 = document.createDocumentFragment();

    const v7 = document.createElement('span');
    v7.appendChild(document.createTextNode(context.name));
    v7.className = style.link;
    v6.appendChild(v7);
    v3.appendChild(v6);

    return { link: v7, $root: v6 };
  });

  const v8 = document.createElement('label');
  v8.appendChild(document.createTextNode(context.name));
  v2.appendChild(v8);

  return { $root: v1, item_root: v2, area: v3, highlight: v4, legal_values: v5 };
}
export { settingsMultiOption };
