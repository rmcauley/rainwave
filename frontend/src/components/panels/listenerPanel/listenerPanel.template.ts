import { $l } from '../../../language';
import type { listenerPanelContext } from './listenerPanel.context';
function listenerPanelTemplate(context: listenerPanelContext) {
  const v1 = document.createElement('div');
  v1.className = 'listener-avatar';
  v1.setAttribute('style', `background-image: url(` + context.listener.avatar + `);`);
  const v2 = document.createElement('div');
  v2.className = 'listener-header';
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v2.appendChild(v3);
  if (context.listener.rank) {
    const v4 = document.createElement('span');
    v4.appendChild(document.createTextNode(context.listener.rank + `.`));
    v4.setAttribute('style', `color: #` + context.listener.colour + `; padding-right: 5px;`);
    v3.appendChild(v4);
  }
  const v5 = document.createElement('span');
  v5.appendChild(
    document.createTextNode($l('registered_in_year', { year: context.listener.regdate })),
  );
  v3.appendChild(v5);
  if (context.isSelf) {
    const v6 = document.createElement('div');
    v6.appendChild(document.createTextNode($l('view_your')));
    v2.appendChild(v6);
    const v7 = document.createElement('div');
    v7.setAttribute('style', `padding-left: 10px`);
    v2.appendChild(v7);
    const v8 = document.createElement('a');
    v8.appendChild(document.createTextNode($l('recent_votes')));
    v8.setAttribute('target', `_blank`);
    v8.href = `/pages/user_recent_votes`;
    v7.appendChild(v8);
    const v9 = document.createElement('div');
    v9.setAttribute('style', `padding-left: 10px`);
    v2.appendChild(v9);
    const v10 = document.createElement('a');
    v10.appendChild(document.createTextNode($l('all_faves')));
    v10.setAttribute('target', `_blank`);
    v10.href = `/pages/all_faves`;
    v9.appendChild(v10);
    const v11 = document.createElement('div');
    v11.setAttribute('style', `padding-left: 10px`);
    v2.appendChild(v11);
    const v12 = document.createElement('a');
    v12.appendChild(document.createTextNode($l('request_history')));
    v12.setAttribute('target', `_blank`);
    v12.href = `/pages/user_requested_history`;
    v11.appendChild(v12);
  }
  let v20: Array<{ $root: DocumentFragment }> | undefined;
  if (context.listener.top_albums.length) {
    const v13 = document.createElement('h2');
    v13.appendChild(document.createTextNode($l('top_rated_albums')));
    v1.appendChild(v13);
    const v14 = document.createElement('div');
    v14.className = 'listener-top-albums';
    v1.appendChild(v14);
    const v15 = context.listener.top_albums.map((context) => {
      const v16 = document.createDocumentFragment();
      const v17 = document.createElement('div');
      v16.appendChild(v17);
      const v18 = document.createElement('div');
      v18.className = 'title';
      v17.appendChild(v18);
      const v19 = document.createElement('a');
      v19.appendChild(document.createTextNode(context.name));
      v19.href = `#!/album/` + context.id;
      v18.appendChild(v19);
      v14.appendChild(v16);
      return { $root: v16 };
    });
    v20 = v15;
  }
  let v29: Array<{ $root: DocumentFragment }> | undefined;
  if (context.listener.top_request_albums) {
    const v21 = document.createElement('h2');
    v21.appendChild(document.createTextNode($l('top_requested_albums')));
    v1.appendChild(v21);
    const v22 = document.createElement('div');
    v22.className = 'listener-top-requests';
    v1.appendChild(v22);
    const v23 = context.listener.top_request_albums.map((context) => {
      const v24 = document.createDocumentFragment();
      const v25 = document.createElement('div');
      v25.className = 'row';
      v24.appendChild(v25);
      const v26 = document.createElement('div');
      v26.appendChild(document.createTextNode(context.request_count_listener.toString()));
      v26.className = 'request-count';
      v25.appendChild(v26);
      const v27 = document.createElement('div');
      v27.className = 'title';
      v25.appendChild(v27);
      const v28 = document.createElement('a');
      v28.appendChild(document.createTextNode(context.name));
      v28.href = `#!/album/` + context.id;
      v27.appendChild(v28);
      v22.appendChild(v24);
      return { $root: v24 };
    });
    v29 = v23;
  }
  const v30 = document.createElement('div');
  v30.className = 'user-detail-container';
  v1.appendChild(v30);
  return { $root: v1, topAlbums: v20, topRequests: v29, userDetail: v30 };
}
export { listenerPanelTemplate };
