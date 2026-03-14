var Song = function (song, parentEvent) {
  var template;
  if (!song.$t) {
    if (parentEvent) {
      song._is_timeline = true;
    }
    template = RWTemplates.song(song);
    song.$t = template;
    song.el = template.root;
  } else {
    template = song.$t;
    song.el = song.$t.root;
  }

  song.autovoted = false;

  AlbumArt(
    song.art || (song.albums.length ? song.albums[0].art : null),
    template.art,
    song.request_id,
  );
  template.art._reset_router = false;

  if (template.rating) {
    Rating.register(song);
  }
  if (song.albums[0].$t.rating) {
    Rating.register(song.albums[0]);
  }
  if ('good' in song && !song.good) {
    if (template.fave) {
      song.$t.fave.parentNode.removeChild(song.$t.fave);
    }
    if (song.albums[0].$t.fave) {
      song.albums[0].$t.fave.parentNode.removeChild(song.albums[0].$t.fave);
    }
    if (song.albums[0].$t.rating) {
      song.albums[0].$t.rating.setAttribute('name', '');
    }
  } else {
    if (template.fave) {
      Fave.register(song);
    }
    if (song.albums[0].$t.fave) {
      Fave.register(song.albums[0], true);
    }
  }
  if (template.votes && song.entry_votes) {
    if (Sizing.simple)
      template.votes.textContent = $l('num_votes', {
        num_votes: song.entry_votes,
      });
    else template.votes.textContent = song.entry_votes;
  }

  song.vote = function (e) {
    if (e && e.target && e.target.nodeName.toLowerCase() == 'a' && e.target.getAttribute('href')) {
      if (MOBILE) {
        e.preventDefault();
        e.stopPropagation();
      } else {
        return;
      }
    }
    if (!song.el.classList.contains('voting_enabled')) {
      return;
    }
    if (
      (!song.autovoted && song.el.classList.contains('voting_registered')) ||
      song.el.classList.contains('voting_clicked')
    ) {
      return;
    }
    if (song.autovoted) {
      song.el.classList.remove('autovoted');
      song.el.classList.remove('voting_registered');
      song.autovoted = false;
    }
    song.el.classList.add('voting_clicked');
    API.async_get('vote', { entry_id: song.entry_id }, null, function () {
      song.el.classList.remove('voting_clicked');
    });
  };

  song.update = function (json) {
    for (var i in json) {
      if (typeof json[i] !== 'object') {
        song[i] = json[i];
      }
    }

    if (template.votes) {
      if (!song.entry_votes) {
        template.votes.textContent = '';
      } else if (Sizing.simple) {
        template.votes.textContent = $l('num_votes', {
          num_votes: song.entry_votes,
        });
      } else {
        template.votes.textContent = song.entry_votes;
      }
    }

    if (template.rating) {
      if (song.rating_user) {
        template.rating.classList.add('rating_user');
      } else if (!template.rating.classList.contains('rating_user')) {
        template.rating.classList.remove('rating_user');
        template.rating.rating_set(song.rating);
      }
    }
    if (song.albums[0].$t.rating) {
      if (song.albums[0].rating_user) {
        song.albums[0].$t.rating.classList.add('rating_user');
      } else if (!song.albums[0].$t.rating.classList.contains('rating_user')) {
        song.albums[0].$t.rating.classList.remove('rating_user');
        song.albums[0].$t.rating.rating_set(song.albums[0].rating);
      }
    }

    song.updateCooldownInfo();
  };

  song.updateCooldownInfo = function () {
    if (!template.cooldown) {
      // nothing
    } else if ('valid' in song && !song.valid && !song.good) {
      song.el.classList.add('cool');
      template.cooldown.textContent = $l('request_only_on_x', {
        station: $l('station_name_' + song.origin_sid),
      });
    } else if (song.cool && song.cool_end > Clock.now + 20) {
      song.el.classList.add('cool');
      template.cooldown.textContent = $l('request_on_cooldown_for', {
        cool_time: Formatting.cooldown(song.cool_end - Clock.now),
      });
    } else if (song.cool) {
      song.el.classList.add('cool');
      template.cooldown.textContent = $l('request_on_cooldown_ends_soon');
    } else if (song.elec_blocked) {
      song.el.classList.add('cool');
      song.elec_blocked_by =
        song.elec_blocked_by.charAt(0).toUpperCase() + song.elec_blocked_by.slice(1);
      template.cooldown.textContent = $l('request_in_election', {
        blocked_by: $l('blocked_by_name__' + song.elec_blocked_by.toLowerCase()),
      });
    } else {
      song.el.classList.remove('cool');
    }
  };

  song.enableVoting = function () {
    song.el.classList.add('voting_enabled');
  };

  song.disableVoting = function () {
    song.el.classList.remove('voting_enabled');
  };

  song.clearVotingStatus = function () {
    song.el.classList.remove('voting_clicked');
    song.el.classList.remove('voting_registered');
    song.el.classList.remove('voting_enabled');
    if (song.$t.vote_button_text) {
      song.$t.vote_button_text.textContent = $l('vote');
    }
  };

  song.removeAutovote = function () {
    song.el.classList.remove('autovoted');
    song.autovoted = false;
  };

  song.registerVote = function () {
    song.removeAutovote();
    song.el.classList.remove('voting_clicked');
    song.el.classList.add('voting_registered');
    if (song.$t.vote_button_text) {
      song.$t.vote_button_text.textContent = $l('voted');
    }
    for (var i = 0; i < parentEvent.songs.length; i++) {
      if (parentEvent.songs[i].id != song.id) {
        parentEvent.songs[i].unregisterVote();
      }
    }
  };

  song.unregisterVote = function () {
    song.el.classList.remove('voting_clicked');
    song.el.classList.remove('voting_registered');
    if (song.$t.vote_button_text) {
      song.$t.vote_button_text.textContent = $l('vote');
    }
  };

  if (song.entry_id) {
    var indicators = [];

    var indicate = function (diff) {
      var div = document.createElement('div');
      if (diff <= 0) {
        div.className = 'plusminus negative';
        div.textContent = diff;
      } else {
        div.className = 'plusminus positive';
        div.textContent = '+' + diff;
      }
      template.votes.parentNode.insertBefore(div, template.votes);
      for (var i = 0; i < indicators.length; i++) {
        if (Sizing.simple) {
          indicators[i].style[Fx.transform] = 'translateX(' + (indicators.length - i) * 23 + 'px)';
        } else {
          indicators[i].style[Fx.transform] =
            'translateX(-100%) translateX(-' + ((indicators.length - i) * 23 + 5) + 'px)';
        }
        indicators[i].style.opacity = 0.7;
      }
      while (indicators.length >= 3) {
        Fx.removeElement(indicators.shift());
      }
      indicators.push(div);
      requestNextAnimationFrame(function () {
        div.classList.add('show');
      });
      setTimeout(function () {
        if (indicators.indexOf(div) !== -1) {
          Fx.removeElement(div);
          indicators.splice(indicators.indexOf(div), 1);
        }
      }, 2000);
    };

    song.liveVoting = function (json) {
      var diff = json.entry_votes - song.entry_votes;
      song.entry_votes = json.entry_votes;

      if (!document.hidden && diff) {
        indicate(diff);
      }

      if (!json.entry_votes) {
        template.votes.textContent = '';
      } else if (Sizing.simple) {
        template.votes.textContent = $l('num_votes', {
          num_votes: json.entry_votes,
        });
      } else {
        template.votes.textContent = json.entry_votes;
      }
    };
  }

  song.el.addEventListener('click', song.vote);

  return song;
};

export { Song };
