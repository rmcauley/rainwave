import type { stationSelectContext } from './stationSelect.context';

function stationSelect(context: stationSelectContext) {
  const v1 = document.createDocumentFragment();

  const v2 = document.createElement('a');
  v2.className = 'station-select-station';
  v2.href = context.url;
  v1.appendChild(v2);

  const v3 = document.createElement('div');
  v3.className = 'station-select-station-details';
  v2.appendChild(v3);

  const v4 = document.createElement('div');
  v4.appendChild(document.createTextNode(context.name));
  v4.className = 'station-select-station-details-name';
  v3.appendChild(v4);

  const v5 = document.createElement('div');
  v5.appendChild(document.createTextNode(context.description));
  v5.className = 'station-select-station-details-description';
  v3.appendChild(v5);

  const v6 = document.createElement('div');
  v6.className = 'station-select-station-now-playing';
  v2.appendChild(v6);

  const v7 = document.createElement('div');
  v7.className = 'station-select-station-now-playing-art';
  v6.appendChild(v7);

  const v8 = document.createElement('div');
  v6.appendChild(v8);

  const v9 = document.createElement('div');
  v9.className = 'station-select-station-now-playing-title';
  v8.appendChild(v9);

  const v10 = document.createElement('div');
  v10.className = 'station-select-station-now-playing-album';
  v8.appendChild(v10);
  
return { $root: v1, menuNp: v6, menuNpArt: v7, menuNpSong: v9, menuNpAlbum: v10 };
}
export { stationSelect };
