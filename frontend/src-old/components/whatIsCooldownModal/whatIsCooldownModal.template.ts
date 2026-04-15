import { $l } from '../../language';

import type { whatIsCooldownModalContext } from './whatIsCooldownModal.context';

import style from './whatIsCooldownModal.module.scss';

function whatIsCooldownModal(context: whatIsCooldownModalContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('p');
  v2.appendChild(document.createTextNode($l('cd_blue_bkg_is')));
  v1.appendChild(v2);

  const v3 = document.createElement('p');
  v3.appendChild(document.createTextNode($l('cd_why_use_cooldown')));
  v1.appendChild(v3);

  const v4 = document.createElement('table');
  v4.className = style['cooldown-explain'];
  v1.appendChild(v4);

  const v5 = document.createElement('tr');
  v4.appendChild(v5);

  const v6 = document.createElement('th');
  v6.appendChild(document.createTextNode($l('cd_type_of_cooldown')));
  v5.appendChild(v6);

  const v7 = document.createElement('th');
  v7.appendChild(document.createTextNode($l('cd_example')));
  v5.appendChild(v7);

  const v8 = document.createElement('th');
  v8.appendChild(document.createTextNode($l('cd_cooldown_length')));
  v5.appendChild(v8);

  const v9 = document.createElement('tr');
  v4.appendChild(v9);

  const v10 = document.createElement('td');
  v10.appendChild(document.createTextNode($l('cd_song')));
  v9.appendChild(v10);

  const v11 = document.createElement('td');
  v11.appendChild(document.createTextNode(`One Winged Angel`));
  v9.appendChild(v11);

  const v12 = document.createElement('td');
  v12.appendChild(document.createTextNode($l('cd_song_length')));
  v9.appendChild(v12);

  const v13 = document.createElement('tr');
  v4.appendChild(v13);

  const v14 = document.createElement('td');
  v14.appendChild(document.createTextNode($l('cd_album')));
  v13.appendChild(v14);

  const v15 = document.createElement('td');
  v15.appendChild(document.createTextNode(`Final Fantasy VII`));
  v13.appendChild(v15);

  const v16 = document.createElement('td');
  v16.appendChild(document.createTextNode($l('cd_album_length')));
  v13.appendChild(v16);

  const v17 = document.createElement('p');
  v17.appendChild(document.createTextNode($l('cd_cooldowns_depend_on')));
  v1.appendChild(v17);

  const v18 = document.createElement('table');
  v18.className = style['cooldown-explain'];
  v1.appendChild(v18);

  const v19 = document.createElement('tr');
  v18.appendChild(v19);

  const v20 = document.createElement('td');
  v20.appendChild(document.createTextNode($l('cd_album_size')));
  v19.appendChild(v20);

  const v21 = document.createElement('td');
  v21.appendChild(document.createTextNode($l('cd_larger_album')));
  v19.appendChild(v21);

  const v22 = document.createElement('tr');
  v18.appendChild(v22);

  const v23 = document.createElement('td');
  v23.appendChild(document.createTextNode($l('cd_rating')));
  v22.appendChild(v23);

  const v24 = document.createElement('td');
  v24.appendChild(document.createTextNode($l('cd_higher_rating')));
  v22.appendChild(v24);

  const v25 = document.createElement('tr');
  v18.appendChild(v25);

  const v26 = document.createElement('td');
  v26.appendChild(document.createTextNode($l('cd_recently_added')));
  v25.appendChild(v26);

  const v27 = document.createElement('td');
  v27.appendChild(document.createTextNode($l('cd_newer')));
  v25.appendChild(v27);

  return { $root: v1 };
}
export { whatIsCooldownModal };
