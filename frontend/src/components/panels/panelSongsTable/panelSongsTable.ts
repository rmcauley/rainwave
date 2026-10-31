import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { panelSongsSort } from './panelSongsSort';
import { panelSongsTableTemplate } from './panelSongsTable.template';
import { panelSongsTableRow } from './panelSongsTableRow/panelSongsTableRow';

class PanelSongTable {
  template: ReturnType<typeof panelSongsTableTemplate>;

  constructor(songs: components['schemas']['album']['songs'], header?: string) {
    this.template = panelSongsTableTemplate({ header });

    const tbody = document.createElement('tbody');
    this.template.table.appendChild(tbody);
    songs.toSorted(panelSongsSort).map((song) => {
      const songTemplate = panelSongsTableRow(song);
      this.template.table.appendChild(songTemplate.$root);
      return songTemplate;
    });
  }
}

export { PanelSongTable };
