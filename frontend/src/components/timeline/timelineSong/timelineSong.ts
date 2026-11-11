import { removeElement } from '../../../helpers/removeElement';
import { $l } from '../../../language';
import { preferences } from '../../../preferences/preferences';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { showErrorTooltip } from '../../errorTooltip/errorTooltip';
import type { SongConstructorData } from '../../song/song';
import { Song } from '../../song/song';

class TimelineSong extends Song {
  song: components['schemas']['_timeline_song'];
  private _autoVoted: boolean = false;
  private _canVote: boolean = false;
  private _voteRegistered: boolean = false;
  private _voteSubmitting: boolean = false;

  constructor(
    data: Omit<SongConstructorData, 'isTimeline' | 'isRequestPanel' | 'song'> & {
      song: components['schemas']['_timeline_song'];
      canVote: boolean;
      autoVoted: boolean;
      voteRegistered: boolean;
    },
  ) {
    super({ ...data, isTimeline: true, isRequestPanel: false });
    this.song = data.song;
    this.canVote = data.canVote;
    this._autoVoted = data.autoVoted;
    this._voteRegistered = data.voteRegistered;
  }

  get canVote(): boolean {
    return this._canVote;
  }
  set canVote(canVote: boolean) {
    this._canVote = canVote;
    if (canVote) {
      this.template.$root.classList.add('timeline-song--voting-enabled');
    } else {
      this.template.$root.classList.remove('timeline-song--voting-enabled');
    }
  }

  get voteRegistered(): boolean {
    return this._canVote;
  }
  set voteRegistered(voteRegistered: boolean) {
    this._canVote = voteRegistered;
    if (voteRegistered) {
      this.template.$root.classList.add('timeline-song--vote-registered');
    } else {
      this.template.$root.classList.remove('timeline-song--vote-registered');
    }
  }

  update = (): void => {};

  updateVoteCount = (): void => {
    if (this.template.votes) {
      if (this.song.entry_votes === 0) {
        this.template.votes.textContent = '';
      } else if (preferences.store.powerUserMode) {
        this.template.votes.textContent = $l('num_votes', {
          num_votes: this.song.entry_votes,
        });
      } else {
        this.template.votes.textContent = this.song.entry_votes.toString();
      }
    }
  };

  showLiveVoting = (diff: number): void => {
    if (!this.template.votesContainer || document.hidden) {
      return;
    }

    const currentIndicators = this.template.votesContainer.querySelectorAll(
      '.timeline-song-live-vote',
    );
    currentIndicators.forEach((indicator, index) => {
      if (indicator instanceof HTMLElement) {
        if (index < 3) {
          if (preferences.store.powerUserMode) {
            indicator.style.transform = `translateX(${(index + 1) * 23}px)`;
          } else {
            indicator.style.transform = `translateX(-100%) translateX(-${(index + 1) * 23 + 5}px)`;
          }
          indicator.style.opacity = `${0.8 - (index + 1) / 10}`;
        } else {
          removeElement(indicator);
        }
      }
    });

    const indicator = document.createElement('div');
    if (diff <= 0) {
      indicator.className = 'timeline-song-live-vote timeline-song-live-vote--negative';
      indicator.textContent = diff.toString();
    } else {
      indicator.className = 'timeline-song-live-vote timeline-song-live-vote--positive';
      indicator.textContent = `+${diff}`;
    }
    this.template.votesContainer.insertBefore(indicator, this.template.votesContainer?.firstChild);

    setTimeout(() => {
      if (indicator.parentElement) {
        removeElement(indicator);
      }
    }, 2000);
  };

  updateLiveVoting = (entryVotes: number): void => {
    const diff = entryVotes - this.song.entry_votes;
    this.song.entry_votes = entryVotes;

    if (!document.hidden && diff) {
      this.showLiveVoting(diff);
    }

    this.updateVoteCount();
  };

  submitVote = (evt: MouseEvent): void => {
    evt.preventDefault();
    evt.stopPropagation();

    if (!this._canVote) {
      return;
    }

    if ((!this._autoVoted && this._voteRegistered) || this._voteSubmitting) {
      return;
    }
    if (this._autoVoted) {
      this.template.$root.classList.remove('timeline-song--autovoted');
      this.template.$root.classList.remove('timeline-song--vote-registered');
      this._autoVoted = false;
    }
    this.template.$root.classList.add('timeline-song--vote-submitted');
    api.fetch('vote', { entry_id: this.song.entry_id }).catch((err: unknown) => {
      showErrorTooltip(err, this.template.title);
    });
  };

  //   song.enableVoting = function () {
  //     song.el.classList.add('voting-enabled');
  //   };

  //   song.disableVoting = function () {
  //     song.el.classList.remove('voting-enabled');
  //   };

  //   song.clearVotingStatus = function () {
  //     song.el.classList.remove('voting-clicked');
  //     song.el.classList.remove('voting-registered');
  //     song.el.classList.remove('voting-enabled');
  //     if (song.$t.vote_button_text) {
  //       song.$t.vote_button_text.textContent = $l('vote');
  //     }
  //   };

  //   song.removeAutovote = function () {
  //     song.el.classList.remove('autovoted');
  //     song.autovoted = false;
  //   };

  //   song.registerVote = function () {
  //     song.removeAutovote();
  //     song.el.classList.remove('voting-clicked');
  //     song.el.classList.add('voting-registered');
  //     if (song.$t.vote_button_text) {
  //       song.$t.vote_button_text.textContent = $l('voted');
  //     }
  //     for (let i = 0; i < parentEvent.songs.length; i++) {
  //       if (parentEvent.songs[i].id != song.id) {
  //         parentEvent.songs[i].unregisterVote();
  //       }
  //     }
  //   };

  //   song.unregisterVote = function () {
  //     song.el.classList.remove('voting-clicked');
  //     song.el.classList.remove('voting-registered');
  //     if (song.$t.vote_button_text) {
  //       song.$t.vote_button_text.textContent = $l('vote');
  //     }
  //   };
}

export { TimelineSong };
