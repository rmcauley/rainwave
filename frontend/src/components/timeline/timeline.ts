import { addCountdownListener } from '../../countdownClock/countdownClock';
import { removeElement } from '../../helpers/removeElement';
import { $l } from '../../language';
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

  private onUserUpdate = (): void => {
    this.schedNextData.forEach((entryData) => {
      const entry = this.getEntry(entryData);
      entry.updateVoteEnabled();
    });
  };

  private onLiveVoting = (payload: components['schemas']['live_voting']): void => {
    Object.entries(payload).forEach(([timelineEntryId, votes]) => {
      const timelineEntry = this.entries.get(Number(timelineEntryId));
      if (!timelineEntry) {
        return;
      }
      votes.forEach((vote) => {
        const song = timelineEntry.songs.find((s) => s.song.entry_id === vote.entry_id);
        if (song) {
          song.updateLiveVoting(vote.entry_votes);
        }
      });
    });
  };

  private getEntry = (entryData: components['schemas']['_timeline_entry']): TimelineEntry => {
    let entry = this.entries.get(entryData.id);
    if (!entry) {
      entry = new TimelineEntry(entryData);
      this.entries.set(entryData.id, entry);
      this.template.timeline.appendChild(entry.template.$root);
    }
    return entry;
  };

  private update = (): void => {
    this.schedHistoryData.forEach((entryData) => {
      const entry = this.getEntry(entryData);
      entry.changeToHistory();
      entry.update(entryData);
    });
    const currentEntry = this.getEntry(this.schedCurrentData);
    currentEntry.changeToCurrent(this.schedCurrentData);
    currentEntry.update(this.schedCurrentData);
    let scheduleType = currentEntry.data.type;
    let scheduleName = currentEntry.data.name;
    this.schedNextData.forEach((entryData, index) => {
      const nextEntry = this.getEntry(entryData);
      nextEntry.update(entryData);
      if (
        index > 0 &&
        nextEntry.data.name === scheduleName &&
        nextEntry.data.type === scheduleType
      ) {
        nextEntry.setHeaderText($l('continued'));
      }
      scheduleName = nextEntry.data.name;
      scheduleType = nextEntry.data.type;
    });
  };

  private reflow = (): void => {
    const allEntryIds = new Set(this.entries.keys());

    const numHistoryToShow = preferences.store.showAllPreviousElections
      ? this.schedHistoryData.length + 1
      : preferences.store.permanentlyVisiblePreviousElections;

    // The topmost Y position, either 0 if everything is shown,
    // or somewhere in the negatives if there are hidden entries.
    let minimumY = 0;
    // First, calculate the height(s) of the hidden entries.
    // e.g. if numHistoryToShow is 5 and schedHistoryData.length is 5,
    // no entries are hidden and this if block is skipped.
    // If numHistoryToShow is 3 and schedHistoryData.length is 5,
    // some entries are hidden and this if block is triggered.
    if (numHistoryToShow < this.schedHistoryData.length) {
      this.schedHistoryData.slice(numHistoryToShow - 1).forEach((entryData) => {
        allEntryIds.delete(entryData.id);
        const entry = this.getEntry(entryData);
        minimumY -= entry.getHeight();
        entry.template.$root.style.transform = `translateY(${minimumY}px)`;
      });
    }

    let y = 0;
    this.schedHistoryData
      .slice(0, numHistoryToShow - 1)
      .toReversed()
      .forEach((entryData) => {
        allEntryIds.delete(entryData.id);
        const entry = this.getEntry(entryData);
        y += entry.getHeight();
        entry.template.$root.style.transform = `translateY(${y}px)`;
      });

    const currentEntry = this.getEntry(this.schedCurrentData);
    y += currentEntry.getHeight();
    currentEntry.template.$root.style.transform = `translateY(${y}px)`;

    this.schedNextData.forEach((entryData) => {
      allEntryIds.delete(entryData.id);
      const entry = this.getEntry(entryData);
      y += entry.getHeight();
      entry.template.$root.style.transform = `translateY(${y}px)`;
    });

    allEntryIds.forEach((entryIdToDelete) => {
      const entry = this.entries.get(entryIdToDelete);
      if (entry) {
        entry.template.$root.style.transform = `translateY(${y - entry.getHeight()}px)`;
        removeElement(entry.template.$root);
      }
    });
  };
}

export { Timeline };
