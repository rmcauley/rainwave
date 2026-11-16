import { arrayShuffle } from '../../../helpers/arrayShuffle';
import { getServerTime } from '../../../helpers/serverTime';
import { $l } from '../../../language';
import { preferences } from '../../../preferences/preferences';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { songHeight } from '../../song/song';
import { isVotingAllowed } from '../isVotingAllowed';
import { TimelineSong } from '../timelineSong/timelineSong';
import { timelineEntryTemplate } from './timelineEntry.template';

// TODO: get this number for real
const headerHeight = 20;

class TimelineEntry {
  template: ReturnType<typeof timelineEntryTemplate>;
  data: components['schemas']['_timeline_entry'];
  songs: TimelineSong[];

  showingSongCount: number;
  headerHidden: boolean;

  constructor(data: components['schemas']['_timeline_entry']) {
    this.template = timelineEntryTemplate();
    this.data = data;
    this.showingSongCount = data.songs.length;
    this.headerHidden = false;

    if (!data.used && data.type === 'Election') {
      this.data = { ...data, songs: arrayShuffle(data.songs) };
    }

    this.songs = [];
    data.songs.forEach((song) => {
      const electionIsOwnRequest = song.elec_request_user_id === api.user.id;
      const timelineSong = new TimelineSong({
        autoVoted: data.voting_allowed && electionIsOwnRequest,
        song,
        voteEnabled: data.voting_allowed,
        voteRegistered: data.voting_allowed && electionIsOwnRequest,
        electionIsOwnRequest,
        electionRequestUserId: song.elec_request_user_id,
        electionRequestUserName: song.elec_request_username,
      });
      this.template.songs.appendChild(timelineSong.template.$root);
      this.songs.push(timelineSong);
    });

    this.template.header.textContent = $l('coming_up');

    this.updateVoteEnabled();
  }

  update = (data: components['schemas']['_timeline_entry']): void => {
    data.songs.forEach((songData) => {
      const song = this.songs.find((s) => s.song.id === songData.id);
      if (!song) {
        return;
      }
      song.song.entry_votes = songData.entry_votes;
      song.updateVoteCount();
    });
    this.updateVoteEnabled();
  };

  changeToCurrent = (data: components['schemas']['_timeline_entry']): void => {
    const newSongs: TimelineSong[] = [];
    data.songs.forEach((song) => {
      const entry = this.songs.find((timelineSong) => timelineSong.song.id === song.id);
      if (entry) {
        newSongs.push(entry);
      }
    });
    this.showingSongCount = 0;
    newSongs.forEach((timelineSong, index) => {
      this.template.songs.appendChild(timelineSong.template.$root);
      if (index === 0 || preferences.store.showSongsThatLostElection) {
        timelineSong.template.$root.style.display = '';
        this.showingSongCount += 1;
      } else {
        timelineSong.template.$root.style.display = 'none';
      }
    });
    this.setHeaderText($l('now_playing'));

    this.data.voting_allowed = false;
    this.updateVoteEnabled();
  };

  changeToHistory = (): void => {
    this.clearVotingStatus();
    this.template.headerContainer.style.display = 'none';
    this.template.progress.style.display = 'none';
    this.headerHidden = false;
    this.songs.forEach((song, index) => {
      if (index > 0) {
        this.template.$root.removeChild(song.template.$root);
      }
    });
    this.showingSongCount = 1;
    this.data.voting_allowed = false;
    this.updateVoteEnabled();
  };

  setHeaderText = (newHeaderText: string): void => {
    this.template.header.textContent = newHeaderText;
  };

  registerVote = (electionEntryId: number): void => {
    this.songs.forEach((timelineSong) => {
      timelineSong.voteRegistered = timelineSong.song.entry_id === electionEntryId;
    });
  };

  updateVoteEnabled = (): void => {
    const voteEnabled = this.data.voting_allowed && isVotingAllowed();
    this.songs.forEach((timelineSong) => {
      timelineSong.voteEnabled = voteEnabled;
    });
  };

  clearVotingStatus = (): void => {
    this.songs.forEach((timelineSong) => {
      timelineSong.clearVotingStatus();
    });
  };

  onCountdownClock = (nowPlayingEndsAt: number, minuteClock: string): void => {
    this.template.clock.textContent = minuteClock;
    const songLength = this.data.songs[0]?.length;
    if (songLength) {
      const progress = Math.min(
        100,
        Math.max(0, (nowPlayingEndsAt - getServerTime()) / songLength),
      );
      const newVal = Math.floor(progress * 100);
      this.template.progressInside.style.width = `${newVal}%`;
    } else {
      this.template.progressInside.style.width = `100%`;
    }
  };

  getHeight = (): number => {
    const songsHeight = this.showingSongCount * songHeight;
    if (!this.headerHidden) {
      return songsHeight + headerHeight;
    }
    return songsHeight;
  };
}

export { TimelineEntry };
