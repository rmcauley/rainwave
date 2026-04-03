import { svgIcon as _svg } from '../../helpers/svg';
import { $l } from '../../language';

import { hamburgerMenu } from './hamburgerMenu.template';

import type { menuContext } from './menu.context';
function menu(context: menuContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `header unselectable`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `menu_wrapper`;
  v2.appendChild(v3);
  const v4 = document.createElement('ul');
  v4.className = `menu hamburger_container`;
  v3.appendChild(v4);
  const v5 = document.createElement('li');
  v5.className = `hamburger_icon_li`;
  v4.appendChild(v5);
  v5.appendChild(hamburgerMenu(context).$root);
  const v6 = document.createElement('a');
  v6.className = `link`;
  v5.appendChild(v6);
  const v7 = document.createElement('div');
  v7.className = `hamburger_icon`;
  v6.appendChild(v7);
  const v8 = document.createElement('ul');
  v8.className = `menu user_status`;
  v3.appendChild(v8);
  if (User.id > 1) {
    const v9 = document.createElement('li');
    v9.className = `user_info`;
    v8.appendChild(v9);
    const v10 = document.createElement('a');
    v10.href = `#!/listener/` + User.id;
    v9.appendChild(v10);
    const v11 = document.createElement('span');
    v11.appendChild(document.createTextNode(User.name));
    v10.appendChild(v11);
    const v12 = document.createElement('img');
    v12.className = `avatar`;
    v12.setAttribute('src', User.avatar);
    v10.appendChild(v12);
  } else {
    const v13 = document.createElement('li');
    v13.className = `login_link`;
    v8.appendChild(v13);
    const v14 = document.createElement('a');
    v14.appendChild(document.createTextNode($l('login')));
    v14.className = `link`;
    v14.href = `/oauth/login`;
    v13.appendChild(v14);
    const v15 = document.createElement('li');
    v15.className = `signup_link`;
    v8.appendChild(v15);
    const v16 = document.createElement('a');
    v16.appendChild(document.createTextNode($l('signup')));
    v16.href = `/oauth/discord`;
    v15.appendChild(v16);
  }
  const v17 = document.createElement('ul');
  v17.className = `menu main_menu`;
  v3.appendChild(v17);
  const v18 = document.createElement('li');
  v18.className = `requests_link`;
  v17.appendChild(v18);
  const v19 = document.createElement('div');
  v19.className = `plusminus`;
  v18.appendChild(v19);
  const v20 = document.createElement('a');
  v18.appendChild(v20);
  const v21 = _svg('requests');
  v21.setAttribute('class', `menu_icon menu_icon_requests`);
  v20.appendChild(v21);
  const v22 = document.createElement('span');
  v22.appendChild(document.createTextNode($l('Requests')));
  v20.appendChild(v22);
  const v23 = document.createElement('li');
  v23.className = `playlist_link`;
  v17.appendChild(v23);
  const v24 = document.createElement('a');
  v23.appendChild(v24);
  const v25 = _svg('library');
  v25.setAttribute('class', `menu_icon menu_icon_library`);
  v24.appendChild(v25);
  const v26 = document.createElement('span');
  v26.appendChild(document.createTextNode($l('library')));
  v24.appendChild(v26);
  const v27 = document.createElement('li');
  v27.className = `search_link`;
  v17.appendChild(v27);
  const v28 = document.createElement('a');
  v27.appendChild(v28);
  const v29 = document.createElement('img');
  v29.className = `menu_icon menu_icon_search`;
  v29.setAttribute('src', `/static/images4/search.png`);
  v28.appendChild(v29);
  const v30 = document.createElement('span');
  v30.appendChild(document.createTextNode($l('search')));
  v28.appendChild(v30);
  const v31 = document.createElement('div');
  v31.setAttribute('id', `station_select`);
  v31.className = `closed`;
  v3.appendChild(v31);
  const v32 = _svg('pulldown');
  v32.setAttribute('class', `pulldown_arrow`);
  v31.appendChild(v32);
  const v33 = document.createElement('a');
  v33.setAttribute('id', `station_select_header`);
  v33.className = `station`;
  v31.appendChild(v33);
  const v34 = document.createElement('div');
  v34.className = `station_details`;
  v33.appendChild(v34);
  const v35 = document.createElement('div');
  v35.appendChild(document.createTextNode($l('station_select_header')));
  v35.className = `station_name`;
  v34.appendChild(v35);
  const v36 = context.stations.map((context) => {
    const v37 = document.createDocumentFragment();
    const v38 = document.createElement('a');
    v38.className = `station`;
    v37.appendChild(v38);
    if (context.id != User.sid && !MOBILE) {
      const v39 = document.createElement('div');
      v39.className = `station_song_container`;
      v38.appendChild(v39);
      const v40 = document.createElement('div');
      v40.className = `ss_art`;
      v39.appendChild(v40);
      const v41 = document.createElement('div');
      v41.className = `ss_title`;
      v39.appendChild(v41);
      const v42 = document.createElement('div');
      v42.className = `ss_album`;
      v39.appendChild(v42);
    }
    const v43 = document.createElement('div');
    v43.className = `station_details`;
    v38.appendChild(v43);
    const v44 = document.createElement('div');
    v44.appendChild(document.createTextNode(context.name));
    v44.className = `station_name`;
    v43.appendChild(v44);
    const v45 = document.createElement('div');
    v45.appendChild(document.createTextNode($l('station_menu_description_id_' + context.id)));
    v45.className = `station_description`;
    v43.appendChild(v45);
    v31.appendChild(v37);
    
return {
      menu_link: v38,
      menu_np: v39,
      menu_np_art: v40,
      menu_np_song: v41,
      menu_np_album: v42,
      $root: v37,
    };
  });
  const v46 = document.createElement('div');
  v46.setAttribute('id', `r4_audio_player`);
  v46.className = `unselectable`;
  v3.appendChild(v46);
  const v47 = document.createElement('div');
  v47.className = `load_indicator`;
  v46.appendChild(v47);
  const v48 = document.createElement('div');
  v48.className = `tuned_in_indicator`;
  v46.appendChild(v48);
  const v49 = document.createElement('div');
  v49.className = `m3u menu_dropdown menu_hover_dropdown pconly`;
  v46.appendChild(v49);
  const v50 = document.createElement('a');
  v50.appendChild(document.createTextNode($l('listen_via_browser')));
  v50.className = `link`;
  v49.appendChild(v50);
  const v51 = document.createElement('a');
  v51.appendChild(document.createTextNode($l('listen_via_mp3')));
  v51.href = `/tune_in/` + User.sid + `.mp3.m3u`;
  v51.setAttribute('target', `_blank`);
  v49.appendChild(v51);
  const v52 = document.createElement('a');
  v52.appendChild(document.createTextNode($l('listen_via_ogg')));
  v52.href = `/tune_in/` + User.sid + `.ogg.m3u`;
  v52.setAttribute('target', `_blank`);
  v49.appendChild(v52);
  const v53 = document.createElement('div');
  v53.className = `background`;
  v46.appendChild(v53);
  const v54 = _svg('play');
  v54.setAttribute('class', `audio_icon audio_icon_play`);
  v53.appendChild(v54);
  const v55 = _svg('stop');
  v55.setAttribute('class', `audio_icon audio_icon_stop pconly`);
  v53.appendChild(v55);
  const v56 = _svg('mute');
  v56.setAttribute('class', `audio_icon audio_icon_mute pconly`);
  v53.appendChild(v56);
  
return {
    $root: v1,
    header: v2,
    menu_wrapper: v3,
    hamburger_container: v4,
    burger_button: v6,
    user_link: v9,
    login: v14,
    main_menu_ul: v17,
    request_indicator: v19,
    request_link: v20,
    request_link_text: v22,
    playlist_link: v24,
    search_link: v28,
    station_select: v31,
    pulldown: v32,
    station_select_header: v33,
    stations: v36,
    player: v46,
    play2: v50,
    play: v54,
    stop: v55,
    mute: v56,
  };
}
export { menu };
