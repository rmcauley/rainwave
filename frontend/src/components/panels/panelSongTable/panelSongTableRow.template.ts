import type { panelSongTableRowContext } from './panelSongTableRow.context';
import { svgIcon as _svg } from '../../../helpers/svg';
function panelSongTableRowTemplate(context: panelSongTableRowContext) {
const v1 = document.createElement('tr');
v1.className='panel-song-table-row-detail-icon';
const v2 = document.createElement('td');
v2.className='panel-song-table-row-detail-icon';
v1.appendChild(v2);
const v3 = _svg('#rw-icon-info');
v2.appendChild(v3);
const v4 = document.createElement('td');
v4.className='panel-song-table-row-fave';
v4.setAttribute('title',`fave`);
v1.appendChild(v4);
const v5 = document.createElement('td');
v5.appendChild(document.createTextNode(context.song.title));
v5.className='panel-song-table-row-title';
v5.setAttribute('title',context.song.title);
v1.appendChild(v5);
let v8: HTMLElementTagNameMap['td'] | undefined;
let v9: HTMLElementTagNameMap['td'] | undefined;
if (context.showCooldown) {
const v6 = document.createElement('td');
v6.className='panel-song-table-row-cooldown';
v1.appendChild(v6);
const v7 = document.createElement('td');
v7.className='panel-song-table-row-length';
v1.appendChild(v7);
v8 = v6;
v9 = v7;
}
let v12: SVGSVGElement | undefined;
if (context.showRatingClear) {
const v10 = document.createElement('td');
v10.className='panel-song-table-row-rating-clear';
v1.appendChild(v10);
const v11 = _svg('#rw-icon-close');
v10.appendChild(v11);
v12 = v11;
}
const v13 = document.createElement('td');
v13.className='panel-song-table-row-rating';
v1.appendChild(v13);
let v15: HTMLElementTagNameMap['td'] | undefined;
if (context.showRatingNumber) {
const v14 = document.createElement('td');
v14.className='panel-song-table-row-rating-number';
v1.appendChild(v14);
v15 = v14;
}
if (context.showArtists) {
const v16 = document.createElement('td');
v16.className='artists';
v1.appendChild(v16);
context.artists.forEach(context => {
const v17 = document.createElement('a');
v17.appendChild(document.createTextNode(context.name));
v17.href=`#!/artist/`+context.id;
v16.appendChild(v17);
});
}
if (context.showLinks) {
const v18 = document.createElement('td');
v18.className='panel-song-table-row-url';
v1.appendChild(v18);
if (context.song.url) {
const v19 = document.createElement('a');
v19.className='url';
v19.href=context.song.url;
v19.setAttribute('target',`_blank`);
v18.appendChild(v19);
}
}
return {"$root": v1,"row": v1,"detailIcon": v2,"title": v5,"cooldown": v8,"length": v9,"ratingClear": v12,"rating": v13,"ratingNumber": v15,}
;}
export { panelSongTableRowTemplate };