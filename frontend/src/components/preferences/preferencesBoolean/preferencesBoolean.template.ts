import { $l } from '../../../language';
import type { preferencesBooleanContext } from './preferencesBoolean.context';
function preferencesBooleanTemplate(context: preferencesBooleanContext) {
  const v1 = document.createElement('div');
  v1.setAttribute('classname', `preferences-boolean`);
  const v2 = document.createElement('div');
  v2.className = 'preferences-boolean-wrapper';
  v1.appendChild(v2);
  const v3 = document.createElement('span');
  v3.appendChild(document.createTextNode($l('yes')));
  v3.className = 'preferences-boolean-yes';
  v2.appendChild(v3);
  const v4 = document.createElement('span');
  v4.className = 'preferences-boolean-bar';
  v2.appendChild(v4);
  const v5 = document.createElement('span');
  v5.className = 'preferences-boolean-dot';
  v2.appendChild(v5);
  const v6 = document.createElement('span');
  v6.appendChild(document.createTextNode($l('no')));
  v6.className = 'preferences-boolean-no';
  v2.appendChild(v6);
  const v7 = document.createElement('label');
  v7.appendChild(document.createTextNode(context.label));
  v1.appendChild(v7);
  return { $root: v1, wrapper: v2, yes: v3, no: v6 };
}
export { preferencesBooleanTemplate };
