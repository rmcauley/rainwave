import { $l } from '../../language';

import type { hamburgerMenuContext } from './hamburgerMenu.context';

import style from './hamburgerMenu.module.scss';

function hamburgerMenu(context: hamburgerMenuContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style['hamburgered menu-dropdown'];
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v2.appendChild(v3);

  const v4 = document.createElement('a');
  v4.appendChild(document.createTextNode(`Discord`));
  v4.href = `https://discord.gg/fdb2cs7puS`;
  v4.setAttribute('target', `_blank`);
  v3.appendChild(v4);
  if (User.id > 1 && !User.uses_oauth) {
    const v5 = document.createElement('a');
    v5.appendChild(document.createTextNode($l('link_discord')));
    v5.href = `/oauth/discord`;
    v3.appendChild(v5);
  }
  if (User.id != 1) {
    const v6 = document.createElement('a');
    v6.appendChild(document.createTextNode($l('logout')));
    v6.href = `/oauth/logout`;
    v3.appendChild(v6);
  }

  const v7 = document.createElement('div');
  v7.className = style['pconly menu-group'];
  v2.appendChild(v7);

  const v8 = document.createElement('a');
  v8.appendChild(document.createTextNode($l('playback_history_link')));
  v8.href = `/pages/playback_history`;
  v8.setAttribute('target', `_blank`);
  v7.appendChild(v8);

  const v9 = document.createElement('div');
  v9.className = style['menu-group'];
  v2.appendChild(v9);

  const v10 = document.createElement('a');
  v10.appendChild(document.createTextNode($l('Patreon')));
  v10.href = `https://www.patreon.com/rainwave`;
  v10.setAttribute('target', `_blank`);
  v9.appendChild(v10);

  const v11 = document.createElement('a');
  v11.appendChild(document.createTextNode($l('PayPal')));
  v11.href = `https://paypal.me/Rainwave/5USD`;
  v11.setAttribute('target', `_blank`);
  v11.className = style.pconly;
  v9.appendChild(v11);

  const v12 = document.createElement('div');
  v12.className = style['menu-group pconly'];
  v2.appendChild(v12);

  const v13 = document.createElement('a');
  v13.appendChild(document.createTextNode($l('github_repo')));
  v13.href = `https://github.com/rmcauley/rainwave/`;
  v13.setAttribute('target', `_blank`);
  v12.appendChild(v13);

  const v14 = document.createElement('a');
  v14.appendChild(document.createTextNode($l('api_docs')));
  v14.href = `/api4/`;
  v14.setAttribute('target', `_blank`);
  v12.appendChild(v14);
  if (!MOBILE) {
    const v15 = document.createElement('div');
    v15.className = style['menu-group pconly'];
    v2.appendChild(v15);

    const v16 = document.createElement('a');
    v16.appendChild(document.createTextNode($l('Settings')));
    v16.className = style.link;
    v15.appendChild(v16);
  }
  
return { $root: v1, settings_link: v16 };
}
export { hamburgerMenu };
