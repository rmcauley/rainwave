import { getDetailTableDataFromSongsAcrossStations } from '../../../helpers/getDetailTableDataFromSongsAcrossStations';
import { getStationName } from '../../../helpers/getStationName';
import { $l } from '../../../language';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { detailSongsTable } from '../../detailSongsTable/detailSongsTable';

function groupDetail(group: components['schemas']['group']): HTMLDivElement {
  const element = document.createElement('div');

  const tablesData = getDetailTableDataFromSongsAcrossStations(group.all_songs_for_sid, false);

  if (tablesData.length > 0) {
    tablesData.forEach((tableData) => {
      const table = detailSongsTable(tableData.songs, tableData.header);
      element.appendChild(table);
    });
  } else {
    const msg = document.createElement('div');
    msg.className = 'no-songs-message';
    msg.textContent = $l('no_songs_on_this_station', { station: getStationName(api.user.sid) });
    element.appendChild(msg);
  }

  return element;
}

export { groupDetail };
