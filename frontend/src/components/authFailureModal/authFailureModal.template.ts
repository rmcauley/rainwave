import { $l } from '../../language';
function authFailureModal(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('p');
  v2.appendChild(document.createTextNode($l('auth_failed_message')));
  v1.appendChild(v2);
  const v3 = document.createElement('p');
  v1.appendChild(v3);
  const v4 = document.createElement('a');
  v4.appendChild(document.createTextNode(`Login Page`));
  v4.className = `link obvious`;
  v4.href = `/oauth/login`;
  v3.appendChild(v4);
  const v5 = document.createElement('p');
  v1.appendChild(v5);
  const v6 = document.createElement('a');
  v6.appendChild(document.createTextNode(`Logout`));
  v6.className = `link obvious`;
  v6.href = `/oauth/logout`;
  v5.appendChild(v6);
  const v7 = document.createElement('p');
  v1.appendChild(v7);
  const v8 = document.createElement('a');
  v8.appendChild(document.createTextNode(`Discord`));
  v8.className = `link obvious`;
  v8.href = `https://discord.gg/fdb2cs7puS`;
  v7.appendChild(v8);
  
return { $root: v1 };
}
export { authFailureModal };
