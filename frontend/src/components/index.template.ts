import { $l } from '../language';

import { menu } from './menu/menu.template';
import { search } from './search/search.template';

import type { indexContext } from './index.context';

import style from './index.module.scss';

function index(context: indexContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style['measure-box'];
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.setAttribute('style', `width: 100px; height: 100px; overflow: scroll`);
  v2.appendChild(v3);

  const v4 = document.createElement('div');
  v4.className = style['list measure-list'];
  v2.appendChild(v4);

  const v5 = document.createElement('div');
  v5.appendChild(document.createTextNode(`Reference`));
  v5.className = style.item;
  v4.appendChild(v5);
  v1.appendChild(menu(context).$root);

  const v6 = document.createElement('div');
  v6.className = style.sizeable;
  v1.appendChild(v6);

  const v7 = document.createElement('div');
  v6.appendChild(v7);

  const v8 = document.createElement('div');
  v8.className = style['requests panel songlist-panel'];
  v6.appendChild(v8);

  const v9 = document.createElement('div');
  v9.className = style['search-panel panel'];
  v6.appendChild(v9);
  v9.appendChild(search(context).$root);

  const v10 = document.createElement('div');
  v10.className = style['lists panel'];
  v6.appendChild(v10);

  const v11 = document.createElement('div');
  v11.className = style.close;
  v10.appendChild(v11);

  const v12 = document.createElement('img');
  v12.setAttribute('src', `/static/images4/cancel.png`);
  v12.setAttribute('alt', `X`);
  v11.appendChild(v12);

  const v13 = document.createElement('ul');
  v13.className = style['panel-header'];
  v10.appendChild(v13);

  const v14 = document.createElement('a');
  v14.href = `#!/album`;
  v13.appendChild(v14);

  const v15 = document.createElement('li');
  v15.appendChild(document.createTextNode($l('Albums')));
  v15.className = style['album-tab'];
  v14.appendChild(v15);

  const v16 = document.createElement('a');
  v16.href = `#!/artist`;
  v13.appendChild(v16);

  const v17 = document.createElement('li');
  v17.appendChild(document.createTextNode($l('Artists')));
  v17.className = style['artist-tab'];
  v16.appendChild(v17);

  const v18 = document.createElement('a');
  v18.href = `#!/group`;
  v13.appendChild(v18);

  const v19 = document.createElement('li');
  v19.appendChild(document.createTextNode($l('groups_tab_title')));
  v19.className = style['group-tab'];
  v18.appendChild(v19);

  const v20 = document.createElement('a');
  v20.href = `#!/request_line`;
  v13.appendChild(v20);

  const v21 = document.createElement('li');
  v21.appendChild(document.createTextNode($l('RequestLine')));
  v21.className = style['listener-tab'];
  v20.appendChild(v21);

  const v22 = document.createElement('div');
  v22.className = style['list album-list'];
  v10.appendChild(v22);

  const v23 = document.createElement('div');
  v23.className = style['list artist-list'];
  v10.appendChild(v23);

  const v24 = document.createElement('div');
  v24.className = style['list group-list'];
  v10.appendChild(v24);

  const v25 = document.createElement('div');
  v25.className = style['list listener-list'];
  v10.appendChild(v25);

  const v26 = document.createElement('div');
  v26.className = style['detail panel'];
  v6.appendChild(v26);

  const v27 = document.createElement('div');
  v27.className = style.close;
  v26.appendChild(v27);

  const v28 = document.createElement('img');
  v28.setAttribute('src', `/static/images4/cancel.png`);
  v28.setAttribute('alt', `X`);
  v27.appendChild(v28);

  const v29 = document.createElement('ul');
  v29.className = style['panel-header selectable'];
  v26.appendChild(v29);

  const v30 = document.createElement('li');
  v30.className = style.open;
  v29.appendChild(v30);

  const v31 = document.createElement('span');
  v30.appendChild(v31);

  const v32 = document.createElement('div');
  v26.appendChild(v32);
  
return {
    $root: v1,
    measure_box: v2,
    scroller_size: v3,
    list_item: v5,
    sizeable_area: v6,
    timeline: v7,
    requests_container: v8,
    search_container: v9,
    lists: v10,
    list_close: v11,
    album_list: v22,
    artist_list: v23,
    group_list: v24,
    listener_list: v25,
    detail_container: v26,
    detail_close: v27,
    detail_header_container: v29,
    detail_header: v31,
    detail: v32,
  };
}
export { index };
