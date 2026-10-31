import { getStationName } from '../../../helpers/getStationName';
import { $l } from '../../../language';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { getTableDataFromAllSongs } from '../allSongsTableData/allSongsTableData';
import { PanelSongTable } from '../panelSongsTable/panelSongsTable';

class ArtistPanel {
  element: HTMLDivElement;

  constructor(artist: components['schemas']['artist']) {
    this.element = document.createElement('div');

    const tablesData = getTableDataFromAllSongs(artist.all_songs, true);

    if (tablesData.length > 0) {
      tablesData.forEach((tableData) => {
        const table = new PanelSongTable(tableData.songs, tableData.header);
        this.element.appendChild(table.template.$root);
      });
    } else {
      const msg = document.createElement('div');
      msg.className = 'no-songs-message';
      msg.textContent = $l('no_songs_on_this_station', { station: getStationName(api.user.sid) });
      this.element.appendChild(msg);
    }
  }
}

export { ArtistPanel };
