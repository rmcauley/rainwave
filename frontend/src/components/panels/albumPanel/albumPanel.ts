import { isProbablyMobileBrowser } from '../../../helpers/isProbablyMobile';
import { $l } from '../../../language';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { setAlbumArt } from '../../albumArt/albumArt';
import { isPlaylistItemNew } from '../../playlist/isPlaylistItemNew';
import { albumPanelTemplate } from './albumPanel.template';
import { albumPanelRatingChart } from './albumPanelRatingChart';

class AlbumPanel {
  template: ReturnType<typeof albumPanelTemplate>;
  constructor(album: components['schemas']['album']) {
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

    // if (this.template.faveAllSongs && this.template.unfaveAllSongs) {
    //   let allFaveRunning = false;
    //   this.template.faveAllSongs.addEventListener('click', function () {
    //     if (allFaveRunning) {
    //       ErrorHandler.tooltipError(ErrorHandler.makeError('websocket_throttle', 400));
    //     }
    //     allFaveRunning = true;
    //     API.async_get('fave_all_songs', { album_id: album.id, fave: true }, function () {
    //       allFaveRunning = false;
    //     });
    //   });
    //   this.template.unfaveAllSongs.addEventListener('click', function () {
    //     if (allFaveRunning) {
    //       ErrorHandler.tooltipError(ErrorHandler.makeError('websocket_throttle', 400));
    //     }
    //     allFaveRunning = true;
    //     API.async_get('fave_all_songs', { album_id: album.id, fave: false }, function () {
    //       allFaveRunning = false;
    //     });
    //   });
    // }
  }
}

export { AlbumPanel };

//   for (i = 0; i < album.songs.length; i++) {
//     if (!album.songs[i].artists) {
//       album.songs[i].artists = JSON.parse(album.songs[i].artist_parseable);
//     }
//   }
//   if (User.sid == 5) {
//     const songs = {};
//     for (i = 0; i < album.songs.length; i++) {
//       if (!songs[album.songs[i].origin_sid]) {
//         songs[album.songs[i].origin_sid] = [];
//       }
//       songs[album.songs[i].origin_sid].push(album.songs[i]);
//     }
//     const forKeynav = [];
//     for (i = 0; i < Stations.length; i++) {
//       if (songs[Stations[i].id]) {
//         const h2 = document.createElement("h2");
//         h2.textContent = $l("songs_from", {
//           station: $l(`station_name_${  Stations[i].id}`),
//         });
//         template._root.appendChild(h2);
//         template._root.appendChild(
//           RWTemplates.detail.songtable({ songs: songs[Stations[i].id] })._root,
//         );
//         forKeynav.push({ songs: songs[Stations[i].id] });
//       }
//     }
//   } else if (album.songs.length === 0) {
//     let sta;
//     for (i = 0; i < Stations.length; i++) {
//       if (Stations[i].id == User.sid) {
//         sta = Stations[i].name;
//       }
//     }
//     const msg = document.createElement("div");
//     msg.className = "no-songs-message";
//     msg.textContent = $l("no_songs_on_this_station", { station: sta });
//     template._root.appendChild(msg);
//   } else {
//     template._root.appendChild(
//       RWTemplates.detail.songtable({ songs: album.songs })._root,
//     );

//   if (album.$t.cooldown_explanation) {
//     album.$t.cooldown_explanation.addEventListener(
//       "click",
//       CooldownExplanation,
//     );
//   }

//   for (i = 0; i < album.songs.length; i++) {
//     Fave.register(album.songs[i]);
//     Rating.register(album.songs[i]);
//     if (album.songs[i].requestable) {
//       Requests.makeClickable(album.songs[i].$t.title, album.songs[i].id);
//     }
//     SongsTableDetail(album.songs[i], i > album.songs.length - 4);
//   }

//   template._headerText = album.name;

//   return template;
// };

// export { RatingColors, RatingChart, CooldownExplanation, AlbumView };
