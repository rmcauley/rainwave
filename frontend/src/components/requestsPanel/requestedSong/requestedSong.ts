import type { components } from '../../../rainwaveApi/rainwave-openapi';
import type { SongConstructorData } from '../../song/song';
import { Song } from '../../song/song';

class RequestedSong extends Song {
  constructor(
    data: Omit<SongConstructorData, 'isTimeline' | 'isRequestPanel' | 'song'> & {
      song: components['schemas']['requests'][number];
    },
  ) {
    super({
      ...data,
      isTimeline: false,
      isRequestPanel: true,
    });

    // if ('good' in song && !song.good) {
    //     if (template.fave) {
    //       song.$t.fave.parentNode.removeChild(song.$t.fave);
    //     }
    //     if (song.albums[0].$t.fave) {
    //       song.albums[0].$t.fave.parentNode.removeChild(song.albums[0].$t.fave);
    //     }
    //     if (song.albums[0].$t.rating) {
    //       song.albums[0].$t.rating.setAttribute('name', '');
    //     }
    //   } else {
    //     if (template.fave) {
    //       Fave.register(song);
    //     }
    //     if (song.albums[0].$t.fave) {
    //       Fave.register(song.albums[0], true);
    //     }
    //   }
  }

  update = (): void => {
    //   song.updateCooldownInfo = function () {
    //     if (!template.cooldown) {
    //       // nothing
    //     } else if ('valid' in song && !song.valid && !song.good) {
    //       song.el.classList.add('cool');
    //       template.cooldown.textContent = $l('request_only_on_x', {
    //         station: $l(`station_name_${  song.origin_sid}`),
    //       });
    //     } else if (song.cool && song.cool_end > Clock.now + 20) {
    //       song.el.classList.add('cool');
    //       template.cooldown.textContent = $l('request_on_cooldown_for', {
    //         cool_time: Formatting.cooldown(song.cool_end - Clock.now),
    //       });
    //     } else if (song.cool) {
    //       song.el.classList.add('cool');
    //       template.cooldown.textContent = $l('request_on_cooldown_ends_soon');
    //     } else if (song.elec_blocked) {
    //       song.el.classList.add('cool');
    //       song.elec_blocked_by =
    //         song.elec_blocked_by.charAt(0).toUpperCase() + song.elec_blocked_by.slice(1);
    //       template.cooldown.textContent = $l('request_in_election', {
    //         blocked_by: $l(`blocked_by_name__${  song.elec_blocked_by.toLowerCase()}`),
    //       });
    //     } else {
    //       song.el.classList.remove('cool');
    //     }
    //   };
  };
}

export { RequestedSong };
