import { formatCooldownBrief } from '../../../../helpers/cooldownFormatting';
import { formatSongLength } from '../../../../helpers/formatSongLength';
import { preferences } from '../../../../preferences/preferences';
import { api } from '../../../../rainwaveApi/api';
import type { components } from '../../../../rainwaveApi/rainwave-openapi';
import { showErrorTooltip } from '../../../errorTooltip/errorTooltip';
import { SongFave } from '../../../fave/songFave/songFave';
import { SongRating } from '../../../ratings/songRating/songRating';
import { panelSongsTableRowTemplate } from './panelSongsTableRow.template';
import { songDetail } from './songDetail/songDetail';

function panelSongsTableRow(
  song: components['schemas']['album']['songs'][number],
): ReturnType<typeof panelSongsTableRowTemplate> {
  const template = panelSongsTableRowTemplate({
    song,
    showRatingClear: preferences.store.showDeleteRatingButton,
    power: preferences.store.powerUserMode,
    artists: JSON.parse(song.artist_parseable) as Array<components['schemas']['_artist']>,
  });

  if (song.cool) {
    template.$root.classList.add('panel-song-table-row--cool');
    if (template.cooldown) {
      template.cooldown.textContent = formatCooldownBrief(song.cool_end);
    }
  }

  if (template.length) {
    template.length.textContent = formatSongLength(song.length);
  }

  template.fave.appendChild(SongFave.create(song.id, song.fave, template.title));
  if (song.fave) {
    template.$root.classList.add('panel-song-table-row--fave');
  }

  template.rating.appendChild(SongRating.create(song.id, song.rating_user, song.rating));
  if (song.requestable) {
    template.$root.classList.add('panel-song-table-row--requestable');
    template.title.addEventListener('click', (): void => {
      api.fetch('request', { song_id: song.id }).catch((err: unknown) => {
        showErrorTooltip(err, template.title);
      });
    });
  }

  template.detailIcon.addEventListener('click', () => {
    template.detailIcon.classList.add('panel-song-table-row-detail-icon--loading');
    api
      .fetch('song', { id: song.id })
      .then((detailPayload) => {
        const detailRow = songDetail(song, detailPayload.song, template.$root.children.length);
        template.$root.parentNode?.insertBefore(detailRow, template.$root.nextSibling);
      })
      .catch((err: unknown) => {
        showErrorTooltip(err, template.detailIcon);
      })
      .finally(() => {
        template.detailIcon.classList.remove('panel-song-table-row-detail-icon--loading');
      });
  });

  return template;
}

export { panelSongsTableRow };
