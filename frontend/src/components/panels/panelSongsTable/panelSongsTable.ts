import { preferences } from '../../../preferences/preferences';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { panelTableTemplate } from '../panelTable/panelTable.template';
import { panelTableSongRowTemplate } from '../panelTable/panelTableSongRow/panelTableSongRow.template';
import { panelSongsSort } from './panelSongsTableSort';

class PanelSongTable {
  template: ReturnType<typeof panelTableTemplate>;

  constructor(songs: components['schemas']['album']['songs'], header?: string) {
    this.template = panelTableTemplate({ header });

    const tbody = document.createElement('tbody');
    this.template.table.appendChild(tbody);
    songs.toSorted(panelSongsSort).map((song) => {
      const songTemplate = panelTableSongRowTemplate({
        song,
        power: preferences.store.powerUserMode,
        showRatingClear: preferences.store.showDeleteRatingButton,
        artists: JSON.parse(song.artist_parseable) as Array<components['schemas']['_artist']>,
      });
      this.template.table.appendChild(songTemplate.$root);
      return songTemplate;
    });
  }
}

export { PanelSongTable };
