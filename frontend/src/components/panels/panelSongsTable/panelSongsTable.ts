// TODO: these formatted data points
//     data-old-class="{{ ^'row ' + (context.cool ? 'cool' : '') + ' ' + (context.fave ? 'song-fave-highlight' : '') + ' ' + (context.requestable ? 'requestable' : 'unrequestable') + ' ' + (context.is_new ? 'is-new' : (context.is_newish ? 'is-newish' : '')) }}"
// {{ ^Formatting.cooldown_glance(context.cool_end) }}
// {{ ^Formatting.minute_clock(context.length) }}
// {{ ^Formatting.rating(context.rating) }}
// TODO: use song detail

import { preferences } from '../../../preferences/preferences';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { showErrorTooltip } from '../../errorTooltip/errorTooltip';
import { SongRating } from '../../ratings/songRating/songRating';
import { panelSongsSort } from './panelSongsSort';
import { panelSongsTableTemplate } from './panelSongsTable.template';
import { panelSongsTableRowTemplate } from './panelSongsTableRow/panelSongsTableRow.template';

class PanelSongTable {
  template: ReturnType<typeof panelSongsTableTemplate>;

  private songs: ReturnType<typeof panelSongsTableRowTemplate>[];

  constructor(songs: components['schemas']['album']['songs'], header?: string) {
    this.template = panelSongsTableTemplate({ header });

    const tbody = document.createElement('tbody');
    this.template.table.appendChild(tbody);
    this.songs = songs.toSorted(panelSongsSort).map((song) => {
      const songTemplate = panelSongsTableRowTemplate({
        song,
        showRatingClear: preferences.store.showDeleteRatingButton,
        power: preferences.store.powerUserMode,
        artists: JSON.parse(song.artist_parseable) as Array<components['schemas']['_artist']>,
      });
      tbody.appendChild(songTemplate.$root);

      songTemplate.rating.appendChild(SongRating.create(song.id, song.rating_user, song.rating));
      if (song.requestable) {
        songTemplate.title.addEventListener('click', (): void => {
          api.fetch('request', { song_id: song.id }).catch((err: unknown) => {
            showErrorTooltip(err, songTemplate.title);
          });
        });
      }

      return songTemplate;
    });
  }
}

export { PanelSongTable };
