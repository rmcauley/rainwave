import { getStationName } from '../../../helpers/getStationName';
import { isProbablyMobileBrowser } from '../../../helpers/isProbablyMobile';
import { $l } from '../../../language';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { setAlbumArt } from '../../albumArt/albumArt';
import { showErrorTooltip } from '../../errorTooltip/errorTooltip';
import { showModal } from '../../modal/modal';
import { isPlaylistItemNew } from '../../playlist/isPlaylistItemNew';
import { PanelSongTable } from '../panelSongsTable/panelSongsTable';
import { albumPanelTemplate } from './albumPanel.template';
import { albumPanelRatingChart } from './albumPanelRatingChart';

class AlbumPanel {
  template: ReturnType<typeof albumPanelTemplate>;

  private faveAllSongsRunning: boolean;

  constructor(album: components['schemas']['album']) {
    this.faveAllSongsRunning = false;

    const hasCooldown = !album.cool && album.songs.some((s) => s.cool);
    const isNew = isPlaylistItemNew(album.added_on);
    const hasNewSongs = !isNew && album.songs.some((s) => isPlaylistItemNew(s.added_on));

    let ratingPercentileMessage;
    if (album.rating_rank_percentile >= 50) {
      ratingPercentileMessage = $l('rating_percentile_top', {
        rating: album.rating,
        percentile: album.rating_rank_percentile,
        percentile_top: 100 - album.rating_rank_percentile,
      });
    } else {
      ratingPercentileMessage = $l('rating_percentile_bottom', {
        rating: album.rating,
        percentile: album.rating_rank_percentile,
      });
    }

    this.template = albumPanelTemplate({
      album,
      hasCooldown,
      hasNewSongs,
      isAllOnCooldown: album.cool,
      isNew,
      ratingPercentileMessage,
      user: api.user,
      showGenres: !isProbablyMobileBrowser,
    });

    if (this.template.ratingGraph) {
      const chart = albumPanelRatingChart(album);
      if (chart) {
        this.template.ratingGraph.parentNode?.replaceChild(chart, this.template.ratingGraph);
      }
    }

    setAlbumArt(this.template.art, album.art);

    const { faveAllSongs, unfaveAllSongs } = this.template;
    if (faveAllSongs && unfaveAllSongs) {
      faveAllSongs.addEventListener('click', () => this.faveAllSongs(album.id, true));
      unfaveAllSongs.addEventListener('click', () => this.faveAllSongs(album.id, false));
    }

    const tables: Record<
      string,
      { header?: string; songs: components['schemas']['album']['songs'] }
    > = {};
    if (api.user.sid === 5) {
      album.songs.forEach((song) => {
        tables[song.origin_sid] ??= {
          header: $l('songs_from', { station: getStationName(song.origin_sid) }),
          songs: [],
        };
        tables[song.origin_sid]?.songs.push(song);
      });
    } else {
      tables[api.user.sid] = { songs: album.songs };
    }

    if (Object.keys(tables).length === 0) {
      const msg = document.createElement('div');
      msg.className = 'no-songs-message';
      msg.textContent = $l('no_songs_on_this_station', { station: getStationName(api.user.sid) });
      this.template.$root.appendChild(msg);
    } else {
      Object.values(tables).forEach((tableData) => {
        const table = new PanelSongTable(tableData.songs, tableData.header);
        this.template.$root.appendChild(table.template.$root);
      });
    }

    if (this.template.albumCooldownExplanationLink) {
      this.template.albumCooldownExplanationLink.addEventListener('click', () =>
        showModal('whatIsCooldown'),
      );
    }
  }

  faveAllSongs = (albumId: number, fave: boolean): void => {
    const { faveAllSongs, unfaveAllSongs } = this.template;
    if (faveAllSongs && unfaveAllSongs) {
      if (this.faveAllSongsRunning) {
        showErrorTooltip(
          { text: $l('websocket_throttle'), tl_key: 'websocket_throttle' },
          fave ? faveAllSongs : unfaveAllSongs,
        );
      }
      this.faveAllSongsRunning = true;
      api
        .fetch('fave_all_songs', { album_id: albumId, fave: true })
        .then(() => (this.faveAllSongsRunning = true))
        .catch((err) => showErrorTooltip(err, faveAllSongs));
    }
  };
}

export { AlbumPanel };
