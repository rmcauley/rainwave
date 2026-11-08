import type { components } from '../../../rainwaveApi/rainwave-openapi';
import type { SongConstructorData } from '../../song/song';
import { Song } from '../../song/song';

class TimelineSong extends Song {
  private autovoted: boolean;

  constructor(
    data: Omit<SongConstructorData, 'isTimeline' | 'isRequestPanel' | 'song'> & {
      song: components['schemas']['_timeline_song'];
    },
  ) {
    super({ ...data, isTimeline: true, isRequestPanel: false });

    this.autovoted = false;
  }

  update = (): void => {
    //
    //   if (template.votes && song.entry_votes) {
    //     if (Sizing.simple)
    //       {template.votes.textContent = $l('num_votes', {
    //         num_votes: song.entry_votes,
    //       });}
    //     else {template.votes.textContent = song.entry_votes;}
    //   }
    //     if (template.votes) {
    //       if (!song.entry_votes) {
    //         template.votes.textContent = '';
    //       } else if (Sizing.simple) {
    //         template.votes.textContent = $l('num_votes', {
    //           num_votes: song.entry_votes,
    //         });
    //       } else {
    //         template.votes.textContent = song.entry_votes;
    //       }
    //     }
  };

  //   if (song.entry_id) {
  //     const indicators = [];

  //     const indicate = function (diff) {
  //       const div = document.createElement('div');
  //       if (diff <= 0) {
  //         div.className = 'plusminus negative';
  //         div.textContent = diff;
  //       } else {
  //         div.className = 'plusminus positive';
  //         div.textContent = `+${  diff}`;
  //       }
  //       template.votes.parentNode.insertBefore(div, template.votes);
  //       for (let i = 0; i < indicators.length; i++) {
  //         if (Sizing.simple) {
  //           indicators[i].style[Fx.transform] = `translateX(${  (indicators.length - i) * 23  }px)`;
  //         } else {
  //           indicators[i].style[Fx.transform] =
  //             `translateX(-100%) translateX(-${  (indicators.length - i) * 23 + 5  }px)`;
  //         }
  //         indicators[i].style.opacity = 0.7;
  //       }
  //       while (indicators.length >= 3) {
  //         Fx.removeElement(indicators.shift());
  //       }
  //       indicators.push(div);
  //       requestNextAnimationFrame(function () {
  //         div.classList.add('show');
  //       });
  //       setTimeout(function () {
  //         if (indicators.includes(div)) {
  //           Fx.removeElement(div);
  //           indicators.splice(indicators.indexOf(div), 1);
  //         }
  //       }, 2000);
  //     };

  //     song.liveVoting = function (json) {
  //       const diff = json.entry_votes - song.entry_votes;
  //       song.entry_votes = json.entry_votes;

  //       if (!document.hidden && diff) {
  //         indicate(diff);
  //       }

  //       if (!json.entry_votes) {
  //         template.votes.textContent = '';
  //       } else if (Sizing.simple) {
  //         template.votes.textContent = $l('num_votes', {
  //           num_votes: json.entry_votes,
  //         });
  //       } else {
  //         template.votes.textContent = json.entry_votes;
  //       }
  //     };
  //   song.vote = function (e) {
  //     if (e?.target?.nodeName.toLowerCase() == 'a' && e.target.getAttribute('href')) {
  //       if (MOBILE) {
  //         e.preventDefault();
  //         e.stopPropagation();
  //       } else {
  //         return;
  //       }
  //     }
  //     if (!song.el.classList.contains('voting-enabled')) {
  //       return;
  //     }
  //     if (
  //       (!song.autovoted && song.el.classList.contains('voting-registered')) ||
  //       song.el.classList.contains('voting-clicked')
  //     ) {
  //       return;
  //     }
  //     if (song.autovoted) {
  //       song.el.classList.remove('autovoted');
  //       song.el.classList.remove('voting-registered');
  //       song.autovoted = false;
  //     }
  //     song.el.classList.add('voting-clicked');
  //     API.async_get('vote', { entry_id: song.entry_id }, null, function () {
  //       song.el.classList.remove('voting-clicked');
  //     });
  //   };

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
