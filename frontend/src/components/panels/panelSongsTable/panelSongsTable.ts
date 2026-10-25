//     data-old-class="{{ ^'row ' + (context.cool ? 'cool' : '') + ' ' + (context.fave ? 'song-fave-highlight' : '') + ' ' + (context.requestable ? 'requestable' : 'unrequestable') + ' ' + (context.is_new ? 'is-new' : (context.is_newish ? 'is-newish' : '')) }}"
// {{ ^Formatting.cooldown_glance(context.cool_end) }}
// {{ ^Formatting.minute_clock(context.length) }}
// {{ ^Formatting.rating(context.rating) }}

import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { panelSongsTableTemplate } from './panelSongsTable.template';
import { panelSongsTableRowTemplate } from './panelSongsTableRow.template';

class PanelSongTable {
  template: ReturnType<typeof panelSongsTableTemplate>;

  private songs: ReturnType<typeof panelSongsTableRowTemplate>[];

  constructor(songs: components['schemas']['album']['songs'], header?: string) {
    this.template = panelSongsTableTemplate({ header });

    const tbody = document.createElement('tbody');
    this.template.table.appendChild(tbody);
    this.songs = songs.map((song) => {
      const songTemplate = panelSongsTableRowTemplate({
        song,
        showArtists: true,
        showCooldown: true,
        showLinks: true,
        showRatingClear: true,
        showRatingNumber: true,
      });
      tbody.appendChild(songTemplate.$root);
      return songTemplate;
    });
  }
}

export { PanelSongTable };
