import { addCountdownListener } from '../../countdownClock/countdownClock';
import { preferences } from '../../preferences/preferences';
import { api } from '../../rainwaveApi/api';
import type { components } from '../../rainwaveApi/rainwave-openapi';
import { timelineTemplate } from './timeline.template';
import { TimelineEntry } from './timelineEntry/timelineEntry';

class Timeline {
  template: ReturnType<typeof timelineTemplate>;

  private schedCurrentData: components['schemas']['sched_current'];
  private schedNextData: components['schemas']['sched_next'];
  private schedHistoryData: components['schemas']['sched_history'];
  private entries: Map<number, TimelineEntry>;

  constructor() {
    this.schedCurrentData = {
      end: 0,
      id: 0,
      length: 0,
      name: null,
      sid: api.user.sid,
      songs: [],
      start: 0,
      start_actual: 0,
      type: 'Election',
      url: null,
      used: true,
      voting_allowed: false,
    };
    this.schedNextData = [];
    this.schedHistoryData = [];
    this.template = timelineTemplate();
    this.entries = new Map();

    api.addEventListener('sched_current', (schedCurrent) => (this.schedCurrentData = schedCurrent));
    api.addEventListener('sched_next', (schedNext) => (this.schedNextData = schedNext));
    api.addEventListener('sched_history', (schedHistory) => (this.schedHistoryData = schedHistory));
    api.addEventListener('sdk_schedule_synced', this.update);
    api.addEventListener('sdk_schedule_synced', this.reflow);
    api.addEventListener('already_voted', this.onAlreadyVoted);
    api.addEventListener('user', this.onUserUpdate);
    api.addEventListener('live_voting', this.onLiveVoting);
    api.addEventListener('vote_result', this.onVoteResult);

    preferences.addEventListener('permanentlyVisiblePreviousElections', this.reflow);
    preferences.addEventListener('showAllPreviousElections', this.reflow);
    preferences.addEventListener('showSongsThatLostElection', this.reflow);

    this.template.historyHeader.addEventListener('click', () => {
      preferences.set('showAllPreviousElections', true);
    });

    addCountdownListener(this.onCountdownClock);
  }

  private onAlreadyVoted = (payload: components['schemas']['already_voted']): void => {
    payload.forEach(([timelineEntryId, electionEntryId]) => {
      this.showRegisteredVote(timelineEntryId, electionEntryId);
    });
  };

  private onVoteResult = (payload: components['schemas']['vote_result']): void => {
    this.showRegisteredVote(payload.elec_id, payload.entry_id);
  };

  private showRegisteredVote = (timelineEntryId: number, electionEntryId: number): void => {
    const timelineEntryData = this.schedNextData.find((entry) => entry.id === timelineEntryId);
    if (!timelineEntryData) {
      return;
    }
    const timelineEntry = this.entries.get(timelineEntryData.id);
    if (!timelineEntry) {
      return;
    }
    timelineEntry.registerVote(electionEntryId);
  };

  private onCountdownClock = (nowPlayingEndsAt: number, minuteClock: string): void => {
    const entry = this.getEntry(this.schedCurrentData);
    entry.onCountdownClock(nowPlayingEndsAt, minuteClock);
  };

  private onUserUpdate = (_payload: components['schemas']['user']): void => {};

  private onLiveVoting = (_payload: components['schemas']['live_voting']): void => {};

  private getEntry = (entryData: components['schemas']['_timeline_entry']): TimelineEntry => {
    let entry = this.entries.get(entryData.id);
    if (!entry) {
      entry = new TimelineEntry(entryData);
      this.entries.set(entryData.id, entry);
    } else {
      entry.setVoteEnabled(entryData.voting_allowed);
    }
    return entry;
  };

  private update = (): void => {
    this.schedHistoryData.forEach((entryData) => {
      this.getEntry(entryData).changeToHistory();
    });
    const currentEntry = this.getEntry(this.schedCurrentData);
    currentEntry.changeToCurrent(this.schedCurrentData);
    let scheduleName = currentEntry.data.name;
    this.schedNextData.forEach((entryData, index) => {
      const nextEntry = this.getEntry(entryData);
      // TODO: this could use some tweaking when PHs are happening
      if (nextEntry.data.name) {
        nextEntry.showHeader();
        if (nextEntry.data.name !== scheduleName) {
          scheduleName = nextEntry.data.name;
          if (nextEntry.data.type === 'OneUp' && index > 0) {
            nextEntry.hideHeader();
          }
        }
      }
    });
  };

  private reflow = (): void => {
    // TODO
  };
}

export { Timeline };
