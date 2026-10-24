import type { stationSelectContext } from './stationSelect.context';

import style from './stationSelect.scss';
function stationSelectTemplate(context: stationSelectContext) {
  const v1 = document.createElement('a');
  v1.className = 'station-select-station';
  v1.href = context.url;
  const v2 = document.createElement('div');
  v2.className = 'station-select-station-details';
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.appendChild(document.createTextNode(context.name));
  v3.className = 'station-select-station-details-name';
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.appendChild(document.createTextNode(context.description));
  v4.className = 'station-select-station-details-description';
  v2.appendChild(v4);
  const v5 = document.createElement('div');
  v5.className = 'station-select-station-now-playing';
  v1.appendChild(v5);
  const v6 = document.createElement('div');
  v6.className = 'station-select-station-now-playing-art';
  v5.appendChild(v6);
  const v7 = document.createElement('div');
  v7.className = 'station-select-station-now-playing-data';
  v5.appendChild(v7);
  const v8 = document.createElement('div');
  v8.className = 'station-select-station-now-playing-title';
  v7.appendChild(v8);
  const v9 = document.createElement('div');
  v9.className = 'station-select-station-now-playing-album';
  v7.appendChild(v9);
  return { $root: v1, anchor: v1, menuNp: v5, menuNpArt: v6, menuNpSong: v8, menuNpAlbum: v9 };
}
export { stationSelectTemplate };
