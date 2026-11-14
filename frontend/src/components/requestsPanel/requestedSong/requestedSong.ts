import { getServerTime } from '../../../helpers/clock';
import { formatCooldownBrief } from '../../../helpers/cooldownFormatting';
import { $l } from '../../../language';
import type { RainwaveTranslationKey } from '../../../language/translations';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import type { SongConstructorData } from '../../song/song';
import { Song } from '../../song/song';

class RequestedSong extends Song {
  song: components['schemas']['requests'][number];

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
    this.song = data.song;
  }

  update = (): void => {
    if (!this.template.cooldownInfo) {
      // nothing
    } else if (!this.song.valid && !this.song.good) {
      this.template.$root.classList.add('requested-song--cool');
      this.template.cooldownInfo.textContent = $l('request_only_on_x', {
        station: $l(`station_name_${this.song.origin_sid}` as RainwaveTranslationKey),
      });
    } else if (this.song.cool && this.song.cool_end && this.song.cool_end > getServerTime() + 20) {
      this.template.$root.classList.add('requested-song--cool');
      this.template.cooldownInfo.textContent = $l('request_on_cooldown_for', {
        cool_time: formatCooldownBrief(this.song.cool_end - getServerTime()),
      });
    } else if (this.song.cool) {
      this.template.$root.classList.add('requested-song--cool');
      this.template.cooldownInfo.textContent = $l('request_on_cooldown_ends_soon');
    } else if (this.song.elec_blocked && this.song.elec_blocked_by) {
      this.template.$root.classList.add('requested-song--cool');
      const blockedBy =
        this.song.elec_blocked_by.charAt(0).toUpperCase() + this.song.elec_blocked_by.slice(1);
      this.template.cooldownInfo.textContent = $l('request_in_election', {
        blocked_by: $l(`blocked_by_name__${blockedBy.toLowerCase()}` as RainwaveTranslationKey),
      });
    } else {
      this.template.$root.classList.remove('requested-song--cool');
    }
  };
}

export { RequestedSong };
