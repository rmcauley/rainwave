import type { preferencesBooleanContext } from './preferencesBoolean.context';
import { $l } from '../../../language';
function preferencesBooleanTemplate(context: preferencesBooleanContext) {
const v1 = document.createElement('div');
v1.setAttribute('classname',`preferences-boolean`);
const v2 = document.createElement('label');
v2.appendChild(document.createTextNode(context.label));
v1.appendChild(v2);
const v3 = document.createElement('div');
v3.className='preferences-boolean-wrapper';
v1.appendChild(v3);
const v4 = document.createElement('span');
v4.appendChild(document.createTextNode($l("yes")));
v4.className='preferences-boolean-yes';
v3.appendChild(v4);
const v5 = document.createElement('span');
v5.className='preferences-boolean-bar';
v3.appendChild(v5);
const v6 = document.createElement('span');
v6.className='preferences-boolean-dot';
v3.appendChild(v6);
const v7 = document.createElement('span');
v7.appendChild(document.createTextNode($l("no")));
v7.className='preferences-boolean-no';
v3.appendChild(v7);
return {"$root": v1,"wrapper": v3,"yes": v4,"no": v7,}
;}
export { preferencesBooleanTemplate };