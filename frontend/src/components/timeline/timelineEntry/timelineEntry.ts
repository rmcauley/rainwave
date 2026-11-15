import { arrayShuffle } from '../../../helpers/arrayShuffle';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { TimelineSong } from '../timelineSong/timelineSong';
import { timelineEntryTemplate } from './timelineEntry.template';

class TimelineEntry {
  template: ReturnType<typeof timelineEntryTemplate>;
  data: components['schemas']['_timeline_entry'];
  songs: TimelineSong[];

  constructor(data: components['schemas']['_timeline_entry']) {
    this.template = timelineEntryTemplate();
    this.data = data;

    if (!data.used && data.type === 'Election') {
      this.data = { ...data, songs: arrayShuffle(data.songs) };
    }

    this.songs = [];
    data.songs.forEach((song) => {
      const timelineSong = new TimelineSong({
        autoVoted: false,
        song,
        voteEnabled: false,
        voteRegistered: false,
        electionIsOwnRequest: song.elec_request_user_id === api.user.id,
        electionRequestUserId: song.elec_request_user_id,
        electionRequestUserName: song.elec_request_username,
      });
      this.template.songs.appendChild(timelineSong.template.$root);
      this.songs.push(timelineSong);
    });
  }

  changeToCurrent = (data: components['schemas']['_timeline_entry']): void => {
    const newSongs: TimelineSong[] = [];
    data.songs.forEach((song) => {
      const entry = this.songs.find((timelineSong) => timelineSong.song.id === song.id);
      if (entry) {
        newSongs.push(entry);
      }
    });
    newSongs.forEach((timelineSong) => {
      this.template.songs.appendChild(timelineSong.template.$root);
    });
    this.hideHeader();
  };

  changeToHistory = (): void => {
    this.clearVotingStatus();
  };

  setHeaderText = (newHeaderText: string): void => {
    this.template.header.textContent = newHeaderText;
  };

  hideHeader = (): void => {
    this.template.headerContainer.style.display = 'none';
    this.template.progress.style.display = 'none';
  };

  showHeader = (): void => {
    this.template.headerContainer.style.display = '';
    this.template.progress.style.display = '';
  };

  registerVote = (electionEntryId: number): void => {
    this.songs.forEach((timelineSong) => {
      timelineSong.voteRegistered = timelineSong.song.entry_id === electionEntryId;
    });
  };

  disableVoting = (): void => {
    this.songs.forEach((timelineSong) => {
      timelineSong.voteEnabled = false;
    });
  };

  clearVotingStatus = (): void => {
    this.songs.forEach((timelineSong) => {
      timelineSong.clearVotingStatus();
    });
  };
}

export { TimelineEntry };
