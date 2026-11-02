import { $l } from '../../../language';
function errorModalTemplate() {
  const v1 = document.createElement('p');
  v1.appendChild(document.createTextNode($l('crash_happened')));
  return { $root: v1 };
}
export { errorModalTemplate };
