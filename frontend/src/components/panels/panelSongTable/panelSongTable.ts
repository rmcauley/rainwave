//     data-old-class="{{ ^'row ' + (context.cool ? 'cool' : '') + ' ' + (context.fave ? 'song-fave-highlight' : '') + ' ' + (context.requestable ? 'requestable' : 'unrequestable') + ' ' + (context.is_new ? 'is-new' : (context.is_newish ? 'is-newish' : '')) }}"
// {{ ^Formatting.cooldown_glance(context.cool_end) }}
// {{ ^Formatting.minute_clock(context.length) }}
// {{ ^Formatting.rating(context.rating) }}

import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { panelSongTableRowTemplate } from './panelSongTableRow.template';

class PanelSongTable {
  private songs: ReturnType<typeof panelSongTableRowTemplate>[];

  constructor(songs: components['schemas']['album']['songs']) {
    this.songs = songs.map((song) =>
      panelSongTableRowTemplate({
        song,
        showArtists: true,
        showCooldown: true,
        showLinks: true,
        showRatingClear: true,
        showRatingNumber: true,
      }),
    );
  }
}

export { PanelSongTable };
