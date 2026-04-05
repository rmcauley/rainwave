import { $l } from '../../../language';
import { fave } from '../../fave/fave.template';
import { rating } from '../../ratings/rating.template';

import type { timelineSongContext } from './timelineSong.context';

import style from './timelineSong.module.scss';

function timelineSong(context: timelineSongContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('div');
  v2.className = style.song;
  v1.appendChild(v2);
  if (context.request_id) {
    const v3 = document.createElement('div');
    v3.className = style['request-cancel'];
    v2.appendChild(v3);

    const v4 = document.createElement('span');
    v4.appendChild(document.createTextNode(`x`));
    v4.className = style['request-cancel-x'];
    v3.appendChild(v4);
  }
  if (context.entry_id) {
    const v5 = document.createElement('div');
    v5.className = style['song-highlight song-highlight-left'];
    v2.appendChild(v5);

    const v6 = document.createElement('div');
    v6.className = style['song-highlight song-highlight-right'];
    v2.appendChild(v6);

    const v7 = document.createElement('div');
    v7.className = style['song-highlight song-highlight-topleft'];
    v2.appendChild(v7);

    const v8 = document.createElement('div');
    v8.className = style['song-highlight song-highlight-topright'];
    v2.appendChild(v8);

    const v9 = document.createElement('div');
    v9.className = style['song-highlight song-highlight-bottomleft'];
    v2.appendChild(v9);

    const v10 = document.createElement('div');
    v10.className = style['song-highlight song-highlight-bottomright'];
    v2.appendChild(v10);
  }
  if (context.entry_id && !MOBILE && Sizing.simple) {
    const v11 = document.createElement('div');
    v11.className = style['vote-button'];
    v2.appendChild(v11);

    const v12 = document.createElement('span');
    v12.appendChild(document.createTextNode($l('vote')));
    v12.className = style['vote-button-rotate'];
    v11.appendChild(v12);
  }

  const v13 = document.createElement('div');
  v13.className = style['art-anchor'];
  v2.appendChild(v13);
  if (context.request_id) {
    const v14 = document.createElement('div');
    v14.className = style['request-sort-grab'];
    v13.appendChild(v14);

    const v15 = document.createElement('img');
    v15.setAttribute('src', `/static/images4/sort.svg`);
    v14.appendChild(v15);
  }

  const v16 = document.createElement('div');
  v16.className = style['art-container'];
  v13.appendChild(v16);
  if (context._is_timeline && User.sid === 5) {
    const v17 = document.createElement('div');
    v17.className =
      style['power-only song-station-indicator song-station-indicator-{{ origin_sid }}'];
    v16.appendChild(v17);
  }
  if (context.elec_request_user_id) {
    if (context.elec_request_user_id == User.id) {
      const v18 = document.createElement('div');
      v18.className = style['requester your-request'];
      v16.appendChild(v18);
      if (!MOBILE) {
        const v19 = document.createElement('a');
        v19.appendChild(document.createTextNode(context.elec_request_username));
        v19.href = `#!/listener/` + context.elec_request_user_id;
        v18.appendChild(v19);
      } else {
        v18.appendChild(document.createTextNode(context.elec_request_username));
      }

      const v20 = document.createElement('div');
      v20.appendChild(document.createTextNode($l('timeline_art__your_request_indicator')));
      v20.className = style['request-indicator your-request'];
      v16.appendChild(v20);
    } else {
      const v21 = document.createElement('div');
      v21.className = style.requester;
      v16.appendChild(v21);
      if (!MOBILE) {
        const v22 = document.createElement('a');
        v22.appendChild(document.createTextNode(context.elec_request_username));
        v22.href = `#!/listener/` + context.elec_request_user_id;
        v21.appendChild(v22);
      } else {
        v21.appendChild(document.createTextNode(context.elec_request_username));
      }

      const v23 = document.createElement('div');
      v23.appendChild(document.createTextNode($l('timeline_art__request_indicator')));
      v23.className = style['request-indicator'];
      v16.appendChild(v23);
    }
  }

  const v24 = document.createElement('div');
  v24.className = style['song-content'];
  v2.appendChild(v24);
  v24.appendChild(rating(context).$root);
  if (context.entry_id) {
    const v25 = document.createElement('div');
    v25.className = style['entry-votes'];
    v24.appendChild(v25);

    const v26 = document.createElement('span');
    v25.appendChild(v26);
  }
  v24.appendChild(fave(context).$root);

  const v27 = document.createElement('div');
  v27.appendChild(document.createTextNode(context.title));
  v27.className = style.title;
  v27.setAttribute('title', context.title);
  v24.appendChild(v27);
  if (context.request_id) {
    const v28 = document.createElement('div');
    v28.className = style['cooldown-info'];
    v24.appendChild(v28);
  } else {
    const v29 = document.createElement('div');
    v29.className = style.artist;
    v24.appendChild(v29);

    const v30 = context.artists.map((context) => {
      const v31 = document.createDocumentFragment();

      const v32 = document.createElement('a');
      v32.appendChild(document.createTextNode(context.name));
      v32.href = `#!/artist/` + context.id;
      v31.appendChild(v32);

      const v33 = document.createElement('span');
      v33.appendChild(document.createTextNode(`,`));
      v31.appendChild(v33);
      v29.appendChild(v31);
      
return { $root: v31 };
    });
    if (context.url) {
      const v34 = document.createElement('div');
      v34.className = style['song-link-container'];
      v24.appendChild(v34);

      const v35 = document.createElement('a');
      v35.appendChild(document.createTextNode(context.link_text));
      v35.className = style['song-link'];
      v35.href = context.url;
      v35.setAttribute('target', `_blank`);
      v34.appendChild(v35);
    }
  }
  
return {
    $root: v1,
    root: v2,
    cancel: v3,
    vote_button_text: v12,
    request_drag: v14,
    art: v16,
    votes: v26,
    title: v27,
    cooldown: v28,
    artists: v30,
  };
}
export { timelineSong };
