import { getDetailTableDataFromSongsAcrossStations } from '../../../helpers/getDetailTableDataFromSongsAcrossStations';
import { getStationName } from '../../../helpers/getStationName';
import { $l } from '../../../language';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { detailSongsTable } from '../../detailSongsTable/detailSongsTable';

class GroupPanel {
  element: HTMLDivElement;

  constructor(group: components['schemas']['group']) {
    this.element = document.createElement('div');

    const tablesData = getDetailTableDataFromSongsAcrossStations(group.all_songs_for_sid, false);

    if (tablesData.length > 0) {
      tablesData.forEach((tableData) => {
        const table = detailSongsTable(tableData.songs, tableData.header);
        this.element.appendChild(table);
      });
    } else {
      const msg = document.createElement('div');
      msg.className = 'no-songs-message';
      msg.textContent = $l('no_songs_on_this_station', { station: getStationName(api.user.sid) });
      this.element.appendChild(msg);
    }
  }
}

export { GroupPanel };
