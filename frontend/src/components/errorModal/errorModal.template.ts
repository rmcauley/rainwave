import { $l } from '../../language';
function errorModal(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('p');
  v2.appendChild(document.createTextNode($l('report_sending')));
  v1.appendChild(v2);
  const v3 = document.createElement('p');
  v1.appendChild(v3);
  const v4 = document.createElement('a');
  v4.appendChild(document.createTextNode($l('please_refresh')));
  v4.className = `link obvious`;
  v4.setAttribute('onclick', `window.location.reload()`);
  v3.appendChild(v4);
  
return { $root: v1, sending_report: v2 };
}
export { errorModal };
