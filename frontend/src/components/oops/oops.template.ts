import { $l } from '../../language';

import type { oopsContext } from './oops.context';

function oops(context: oopsContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.setAttribute('style', `margin-left: 5px`);
  v1.appendChild(v2);

  const v3 = document.createElement('b');
  v3.appendChild(document.createTextNode($l('oops')));
  v2.appendChild(v3);

  const v4 = document.createElement('p');
  v4.appendChild(document.createTextNode($l('something_went_wrong')));
  v2.appendChild(v4);
  
return { $root: v1 };
}
export { oops };
