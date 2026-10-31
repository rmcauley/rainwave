import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { getTableDataFromAllSongs } from '../allSongsTableData/allSongsTableData';
import { PanelSongTable } from '../panelSongsTable/panelSongsTable';

class GroupPanel {
  element: HTMLDivElement;

  constructor(group: components['schemas']['group']) {
    this.element = document.createElement('div');

    const tablesData = getTableDataFromAllSongs(group.all_songs_for_sid, false);

    if (tablesData.length > 0) {
      tablesData.forEach((tableData) => {
        const table = new PanelSongTable(tableData.songs, tableData.header);
        this.element.appendChild(table.template.$root);
      });
    } else {
      // TODO: no songs available
    }
  }
}

export { GroupPanel };
