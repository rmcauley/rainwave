import { $l } from '../../../language';

import type { stationSelectContext } from './stationSelect.context';

import style from './stationSelect.module.scss';

function stationSelect(context: stationSelectContext) {
  const v1 = document.createDocumentFragment();

  const v2 = context.stations.map((context) => {
    const v3 = document.createDocumentFragment();

    const v4 = document.createElement('a');
    v4.className = style.station;
    v3.appendChild(v4);

    const v5 = document.createElement('div');
    v5.className = style['station-song-container'];
    v4.appendChild(v5);

    const v6 = document.createElement('div');
    v6.className = style['ss-art'];
    v5.appendChild(v6);

    const v7 = document.createElement('div');
    v7.className = style['ss-title'];
    v5.appendChild(v7);

    const v8 = document.createElement('div');
    v8.className = style['ss-album'];
    v5.appendChild(v8);

    const v9 = document.createElement('div');
    v9.className = style['station-details'];
    v4.appendChild(v9);

    const v10 = document.createElement('div');
    v10.appendChild(document.createTextNode(context.name));
    v10.className = style['station-name'];
    v9.appendChild(v10);

    const v11 = document.createElement('div');
    v11.appendChild(document.createTextNode($l('station_menu_description_id_' + context.id)));
    v11.className = style['station-description'];
    v9.appendChild(v11);
    v1.appendChild(v3);
    
return { menuNp: v5, menuNpArt: v6, menuNpSong: v7, menuNpAlbum: v8, $root: v3 };
  });
  
return { $root: v1, stations: v2 };
}
export { stationSelect };
