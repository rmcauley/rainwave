import { $l } from '../../../language';
import { rating } from '../../ratings/rating.template';

import type { listenerDetailContext } from './listenerDetail.context';
function listenerDetail(context: listenerDetailContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `art_anchor`;
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = `art_container`;
  v3.setAttribute('style', `background-image: url(` + context.avatar + `);`);
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = `detail_header`;
  v1.appendChild(v4);
  const v5 = document.createElement('div');
  v4.appendChild(v5);
  if (context.rank) {
    const v6 = document.createElement('span');
    v6.appendChild(document.createTextNode(context.rank + `.`));
    v6.setAttribute('style', `color: #` + context.colour + `; padding-right: 5px;`);
    v5.appendChild(v6);
  }
  const v7 = document.createElement('span');
  v7.appendChild(document.createTextNode($l('registered_in_year', { year: context.regdate })));
  v5.appendChild(v7);
  if (context.user_id == User.id) {
    const v8 = document.createElement('div');
    v8.appendChild(document.createTextNode($l('view_your')));
    v4.appendChild(v8);
    const v9 = document.createElement('div');
    v9.setAttribute('style', `padding-left: 10px`);
    v4.appendChild(v9);
    const v10 = document.createElement('a');
    v10.appendChild(document.createTextNode($l('recent_votes')));
    v10.className = `obvious`;
    v10.setAttribute('target', `_blank`);
    v10.href = `/pages/user_recent_votes`;
    v9.appendChild(v10);
    const v11 = document.createElement('div');
    v11.setAttribute('style', `padding-left: 10px`);
    v4.appendChild(v11);
    const v12 = document.createElement('a');
    v12.appendChild(document.createTextNode($l('all_faves')));
    v12.className = `obvious`;
    v12.setAttribute('target', `_blank`);
    v12.href = `/pages/all_faves`;
    v11.appendChild(v12);
    const v13 = document.createElement('div');
    v13.setAttribute('style', `padding-left: 10px`);
    v4.appendChild(v13);
    const v14 = document.createElement('a');
    v14.appendChild(document.createTextNode($l('request_history')));
    v14.className = `obvious`;
    v14.setAttribute('target', `_blank`);
    v14.href = `/pages/user_requested_history`;
    v13.appendChild(v14);
  }
  if (context.top_albums.length) {
    const v15 = document.createElement('h2');
    v15.appendChild(document.createTextNode($l('top_rated_albums')));
    v1.appendChild(v15);
    const v16 = context.top_albums.map((context) => {
      const v17 = document.createDocumentFragment();
      const v18 = document.createElement('div');
      v18.className = `row`;
      v17.appendChild(v18);
      v18.appendChild(rating(context).$root);
      const v19 = document.createElement('div');
      v19.className = `title`;
      v18.appendChild(v19);
      const v20 = document.createElement('a');
      v20.appendChild(document.createTextNode(context.name));
      v20.href = `#!/album/` + context.id;
      v19.appendChild(v20);
      v1.appendChild(v17);
      
return { $root: v17 };
    });
  }
  if (context.top_request_albums) {
    const v21 = document.createElement('h2');
    v21.appendChild(document.createTextNode($l('top_requested_albums')));
    v1.appendChild(v21);
    const v22 = context.top_request_albums.map((context) => {
      const v23 = document.createDocumentFragment();
      const v24 = document.createElement('div');
      v24.className = `row`;
      v23.appendChild(v24);
      const v25 = document.createElement('div');
      v25.appendChild(document.createTextNode(context.request_count_listener));
      v25.className = `request_count`;
      v24.appendChild(v25);
      const v26 = document.createElement('div');
      v26.className = `title`;
      v24.appendChild(v26);
      const v27 = document.createElement('a');
      v27.appendChild(document.createTextNode(context.name));
      v27.href = `#!/album/` + context.id;
      v26.appendChild(v27);
      v1.appendChild(v23);
      
return { $root: v23 };
    });
  }
  const v28 = document.createElement('div');
  v28.className = `user_detail_container`;
  v1.appendChild(v28);
  
return { $root: v1, top_albums: v16, top_request_albums: v22, user_detail_container: v28 };
}
export { listenerDetail };
