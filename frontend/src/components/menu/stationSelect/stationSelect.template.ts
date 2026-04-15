import type { stationSelectContext } from './stationSelect.context';

import style from './stationSelect.scss';

function stationSelect(context: stationSelectContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('a');
  v2.className = style['station-select-station'];
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.className = style['station-select-station-now-playing'];
  v2.appendChild(v3);

  const v4 = document.createElement('div');
  v4.className = style['station-select-station-now-playing-art'];
  v3.appendChild(v4);

  const v5 = document.createElement('div');
  v5.className = style['station-select-station-now-playing-title'];
  v3.appendChild(v5);

  const v6 = document.createElement('div');
  v6.className = style['station-select-station-now-playing-album'];
  v3.appendChild(v6);

  const v7 = document.createElement('div');
  v7.className = style['station-select-station-details'];
  v2.appendChild(v7);

  const v8 = document.createElement('div');
  v8.appendChild(document.createTextNode(context.name));
  v8.className = style['station-select-station-details-name'];
  v7.appendChild(v8);

  const v9 = document.createElement('div');
  v9.appendChild(document.createTextNode(context.description));
  v9.className = style['station-select-station-details-description'];
  v7.appendChild(v9);
  
return { $root: v1, menuNp: v3, menuNpArt: v4, menuNpSong: v5, menuNpAlbum: v6 };
}
export { stationSelect };
