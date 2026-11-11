import type { songContext } from './song.context';
import style from './song.scss';
import { $l } from '../../language';
import { svgIcon as _svg } from '../../helpers/svg';
function songTemplate(context: songContext) {
const v1 = document.createElement('div');
v1.className='song';
let v4: HTMLElementTagNameMap['div'] | undefined;
if (context.isRequestPanel) {
const v2 = document.createElement('div');
v2.className='song-request-cancel';
v1.appendChild(v2);
const v3 = _svg('#rw-icon-close');
v2.appendChild(v3);
v4 = v2;
}
if (context.isTimeline) {
const v5 = document.createElement('div');
v5.className='song-highlight song-highlight-left';
v1.appendChild(v5);
const v6 = document.createElement('div');
v6.className='song-highlight song-highlight-right';
v1.appendChild(v6);
const v7 = document.createElement('div');
v7.className='song-highlight song-highlight-topleft';
v1.appendChild(v7);
const v8 = document.createElement('div');
v8.className='song-highlight song-highlight-topright';
v1.appendChild(v8);
const v9 = document.createElement('div');
v9.className='song-highlight song-highlight-bottomleft';
v1.appendChild(v9);
const v10 = document.createElement('div');
v10.className='song-highlight song-highlight-bottomright';
v1.appendChild(v10);
}
const v11 = document.createElement('div');
v11.className='song-flex';
v1.appendChild(v11);
let v14: HTMLElementTagNameMap['span'] | undefined;
if (context.isTimeline && context.isPowerUserMode) {
const v12 = document.createElement('div');
v12.className='song-vote-button';
v11.appendChild(v12);
const v13 = document.createElement('span');
v13.appendChild(document.createTextNode($l("vote")));
v13.className='song-vote-button-text';
v12.appendChild(v13);
v14 = v13;
}
const v15 = document.createElement('div');
v15.className='song-art';
v11.appendChild(v15);
let v18: HTMLElementTagNameMap['div'] | undefined;
if (context.isRequestPanel) {
const v16 = document.createElement('div');
v16.className='song-art-drag';
v15.appendChild(v16);
const v17 = _svg('#rw-sort');
v16.appendChild(v17);
v18 = v16;
}
const v19 = document.createElement('div');
v19.className='song-art-image';
v15.appendChild(v19);
if (context.isTimeline && context.sid === 5) {
const v20 = document.createElement('div');
v20.className='song-station-indicator song-station-indicator-{{ song.origin_sid }}';
v19.appendChild(v20);
}
if (context.electionRequestUserName && context.electionRequestUserId) {
if (context.electionIsOwnRequest) {
const v21 = document.createElement('div');
v21.className='song-requester song-requester--your-request';
v19.appendChild(v21);
const v22 = document.createElement('a');
v22.appendChild(document.createTextNode(context.electionRequestUserName));
v22.href=`#!/listener/`+context.electionRequestUserId;
v21.appendChild(v22);
const v23 = document.createElement('div');
v23.appendChild(document.createTextNode($l("timeline_art__your_request_indicator")));
v23.className='song-requester-indicator song-requester-indicator--your-request';
v19.appendChild(v23);
} else {
const v24 = document.createElement('div');
v24.className='song-requester';
v19.appendChild(v24);
const v25 = document.createElement('a');
v25.appendChild(document.createTextNode(context.electionRequestUserName));
v25.href=`#!/listener/`+context.electionRequestUserId;
v24.appendChild(v25);
const v26 = document.createElement('div');
v26.appendChild(document.createTextNode($l("timeline_art__request_indicator")));
v26.className='song-requester-indicator';
v19.appendChild(v26);
}
}
const v27 = document.createElement('div');
v27.className='song-content';
v11.appendChild(v27);
const v28 = document.createElement('div');
v27.appendChild(v28);
const v29 = document.createElement('div');
v29.className='song-content-fave';
v28.appendChild(v29);
const v30 = document.createElement('div');
v30.appendChild(document.createTextNode(context.song.title));
v30.className='song-content-title';
v30.setAttribute('title',context.song.title);
v28.appendChild(v30);
let v33: HTMLElementTagNameMap['div'] | undefined;
let v34: HTMLElementTagNameMap['span'] | undefined;
if (context.isTimeline) {
const v31 = document.createElement('div');
v31.className='song-content-votes';
v28.appendChild(v31);
const v32 = document.createElement('span');
v31.appendChild(v32);
v33 = v31;
v34 = v32;
}
const v35 = document.createElement('div');
v35.className='song-content-rating';
v28.appendChild(v35);
const v36 = document.createElement('div');
v27.appendChild(v36);
const v37 = document.createElement('div');
v37.className='song-content-album-fave';
v36.appendChild(v37);
const v38 = document.createElement('div');
v38.className='song-content-album-title';
v38.setAttribute('title',context.song.albums[0].name);
v36.appendChild(v38);
const v39 = document.createElement('a');
v39.appendChild(document.createTextNode(context.song.albums[0].name));
v39.href=`#!/album/`+context.song.albums[0].id;
v38.appendChild(v39);
const v40 = document.createElement('div');
v40.className='song-content-album-rating';
v36.appendChild(v40);
const v41 = document.createElement('div');
v27.appendChild(v41);
let v50: HTMLElementTagNameMap['div'] | undefined;
let v51: Array<{"$root": DocumentFragment;}> | undefined;
if (context.isRequestPanel) {
const v42 = document.createElement('div');
v42.className='song-content-cooldown-info';
v41.appendChild(v42);
v50 = v42;
} else {
const v43 = document.createElement('div');
v43.className='song-content-artists';
v41.appendChild(v43);
const v44 = context.song.artists.map(context => {
const v45 = document.createDocumentFragment();
const v46 = document.createElement('a');
v46.appendChild(document.createTextNode(context.name));
v46.href=`#!/artist/`+context.id;
v45.appendChild(v46);
const v47 = document.createElement('span');
v47.appendChild(document.createTextNode(`,`));
v45.appendChild(v47);
v43.appendChild(v45);
return {"$root": v45,};
});
if (context.song.url && context.song.link_text) {
const v48 = document.createElement('div');
v48.className='song-content-link';
v41.appendChild(v48);
const v49 = document.createElement('a');
v49.appendChild(document.createTextNode(context.song.link_text));
v49.className='song-content-link-anchor';
v49.href=context.song.url;
v49.setAttribute('target',`_blank`);
v48.appendChild(v49);
}
v51 = v44;
}
return {"$root": v1,"requestCancel": v4,"voteButtonText": v14,"requestDrag": v18,"artImage": v19,"fave": v29,"title": v30,"votesContainer": v33,"votes": v34,"rating": v35,"albumFave": v37,"albumTitle": v38,"albumRating": v40,"cooldownInfo": v50,"artists": v51,}
;}
export { songTemplate };