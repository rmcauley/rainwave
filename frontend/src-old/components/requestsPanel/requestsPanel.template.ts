import { $l } from '../../language';

import type { requestsPanelContext } from './requestsPanel.context';

import style from './requestsPanel.module.scss';

function requestsPanel(context: requestsPanelContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style.close;
  v1.appendChild(v2);

  const v3 = document.createElement('img');
  v3.setAttribute('src', `/static/images4/cancel.png`);
  v3.setAttribute('alt', `X`);
  v2.appendChild(v3);

  const v4 = document.createElement('ul');
  v4.className = style['panel-header'];
  v1.appendChild(v4);

  const v5 = document.createElement('li');
  v5.className = style.open;
  v4.appendChild(v5);

  const v6 = document.createElement('a');
  v6.appendChild(document.createTextNode($l('Requests')));
  v5.appendChild(v6);
  if (!Sizing.simple) {
    const v7 = document.createElement('div');
    v7.className = style.plusminus;
    v1.appendChild(v7);
  }

  const v8 = document.createElement('ul');
  v8.className = style['panel-header request-icons unselectable'];
  v1.appendChild(v8);

  const v9 = document.createElement('li');
  v9.className = style['pause-queue'];
  v8.appendChild(v9);

  const v10 = document.createElement('img');
  v10.setAttribute('src', `/static/images4/request_pause.png`);
  v9.appendChild(v10);

  const v11 = document.createElement('span');
  v11.appendChild(document.createTextNode($l('Suspend')));
  v9.appendChild(v11);

  const v12 = document.createElement('li');
  v12.className = style['pause-queue'];
  v8.appendChild(v12);

  const v13 = document.createElement('img');
  v13.setAttribute('src', `/static/images4/request_play.png`);
  v12.appendChild(v13);

  const v14 = document.createElement('span');
  v14.appendChild(document.createTextNode($l('Resume')));
  v12.appendChild(v14);

  const v15 = document.createElement('li');
  v8.appendChild(v15);

  const v16 = document.createElement('img');
  v16.setAttribute('src', `/static/images4/request_faves.png`);
  v15.appendChild(v16);

  const v17 = document.createElement('span');
  v17.appendChild(document.createTextNode($l('Faves')));
  v15.appendChild(v17);

  const v18 = document.createElement('li');
  v8.appendChild(v18);

  const v19 = document.createElement('img');
  v19.setAttribute('src', `/static/images4/request_unrated.png`);
  v18.appendChild(v19);

  const v20 = document.createElement('span');
  v20.appendChild(document.createTextNode($l('Unrated')));
  v18.appendChild(v20);

  const v21 = document.createElement('li');
  v8.appendChild(v21);

  const v22 = document.createElement('img');
  v22.setAttribute('src', `/static/images4/request_clear.png`);
  v21.appendChild(v22);

  const v23 = document.createElement('span');
  v23.appendChild(document.createTextNode($l('Clear')));
  v21.appendChild(v23);

  const v24 = document.createElement('div');
  v1.appendChild(v24);

  const v25 = document.createElement('div');
  v25.className = style.song;
  v25.setAttribute('style', `visibility: hidden; z-index: -1; transition: none`);
  v24.appendChild(v25);
  
return {
    $root: v1,
    panelClose: v2,
    requestHeader: v6,
    requestIndicator2: v7,
    requestsPause: v9,
    requestsPlay: v12,
    requestsFavfill: v15,
    requestsUnrated: v18,
    requestsClear: v21,
    songList: v24,
    lastSongPadder: v25,
  };
}
export { requestsPanel };
