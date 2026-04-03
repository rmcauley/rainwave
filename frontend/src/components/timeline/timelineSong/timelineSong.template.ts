import { $l } from '../../../language';
import { fave } from '../../fave/fave.template';
import { rating } from '../../ratings/rating.template';
function timelineSong(context) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `song`;
  v1.appendChild(v2);
  if (context.request_id) {
    const v3 = document.createElement('div');
    v3.className = `request_cancel`;
    v2.appendChild(v3);
    const v4 = document.createElement('span');
    v4.appendChild(document.createTextNode(`x`));
    v4.className = `request_cancel_x`;
    v3.appendChild(v4);
  }
  if (context.entry_id) {
    const v5 = document.createElement('div');
    v5.className = `song_highlight song_highlight_left`;
    v2.appendChild(v5);
    const v6 = document.createElement('div');
    v6.className = `song_highlight song_highlight_right`;
    v2.appendChild(v6);
    const v7 = document.createElement('div');
    v7.className = `song_highlight song_highlight_topleft`;
    v2.appendChild(v7);
    const v8 = document.createElement('div');
    v8.className = `song_highlight song_highlight_topright`;
    v2.appendChild(v8);
    const v9 = document.createElement('div');
    v9.className = `song_highlight song_highlight_bottomleft`;
    v2.appendChild(v9);
    const v10 = document.createElement('div');
    v10.className = `song_highlight song_highlight_bottomright`;
    v2.appendChild(v10);
  }
  if (context.entry_id && !MOBILE && Sizing.simple) {
    const v11 = document.createElement('div');
    v11.className = `vote_button`;
    v2.appendChild(v11);
    const v12 = document.createElement('span');
    v12.appendChild(document.createTextNode($l('vote')));
    v12.className = `vote_button_rotate`;
    v11.appendChild(v12);
  }
  const v13 = document.createElement('div');
  v13.className = `art_anchor`;
  v2.appendChild(v13);
  if (context.request_id) {
    const v14 = document.createElement('div');
    v14.className = `request_sort_grab`;
    v13.appendChild(v14);
    const v15 = document.createElement('img');
    v15.setAttribute('src', `/static/images4/sort.svg`);
    v14.appendChild(v15);
  }
  const v16 = document.createElement('div');
  v16.className = `art_container`;
  v13.appendChild(v16);
  if (context._is_timeline && User.sid === 5) {
    const v17 = document.createElement('div');
    v17.className =
      `power_only song_station_indicator song_station_indicator_` + context.origin_sid;
    v16.appendChild(v17);
  }
  if (context.elec_request_user_id) {
    if (context.elec_request_user_id == User.id) {
      const v18 = document.createElement('div');
      v18.className = `requester your_request`;
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
      v20.className = `request_indicator your_request`;
      v16.appendChild(v20);
    } else {
      const v21 = document.createElement('div');
      v21.className = `requester`;
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
      v23.className = `request_indicator`;
      v16.appendChild(v23);
    }
  }
  const v24 = document.createElement('div');
  v24.className = `song_content`;
  v2.appendChild(v24);
  v24.appendChild(rating(context).$root);
  if (context.entry_id) {
    const v25 = document.createElement('div');
    v25.className = `entry_votes`;
    v24.appendChild(v25);
    const v26 = document.createElement('span');
    v25.appendChild(v26);
  }
  v24.appendChild(fave(context).$root);
  const v27 = document.createElement('div');
  v27.appendChild(document.createTextNode(context.title));
  v27.className = `title`;
  v27.setAttribute('title', context.title);
  v24.appendChild(v27);
  if (context.request_id) {
    const v28 = document.createElement('div');
    v28.className = `cooldown_info`;
    v24.appendChild(v28);
  } else {
    const v29 = document.createElement('div');
    v29.className = `artist`;
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
      v34.className = `song_link_container`;
      v24.appendChild(v34);
      const v35 = document.createElement('a');
      v35.appendChild(document.createTextNode(context.link_text));
      v35.className = `song_link`;
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
