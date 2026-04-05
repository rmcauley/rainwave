const messages = [];
let el;
let template;
let events = [];
let schedCurrent;
let schedNext;
let schedHistory;
let scroller;
let historyBar;
let rootTemplate;
let historyEvents = [];

INIT_TASKS.on_init.push(function (rootTmpl) {
  rootTemplate = rootTmpl;
  Prefs.define('l_stk', [false, true], true);
  Prefs.define('l_stksz', [0, 1, 2, 3, 4, 5], true);
  Prefs.define('l_displose', [false, true]);
  Prefs.add_callback('l_stk', reflow);
  Prefs.add_callback('l_stksz', reflow);
  Prefs.add_callback('l_displose', function (nv) {
    if (nv) {
      document.body.classList.add('displose');
    } else {
      document.body.classList.remove('displose');
    }
    reflow(true);
  });

  api.addEventListener('sched_current', function (json) {
    schedCurrent = json;
  });
  api.addEventListener('sched_next', function (json) {
    schedNext = json;
  });
  api.addEventListener('sched_history', function (json) {
    schedHistory = json;
  });
  api.addEventListener('_SYNC_SCHEDULE_COMPLETE', update);
  api.addEventListener('_SYNC_SCHEDULE_COMPLETE', reflow);
  api.addEventListener('already_voted', handleAlreadyVoted);
  api.addEventListener('all_stations_info', checkForEvents);
  api.addEventListener('user', votingAllowedCheck);
  api.addEventListener('user', lockCheck);
  if (!MOBILE) {
    api.addEventListener('live_voting', liveVoting);
  }
  api.addEventListener('vote_result', function (json) {
    if (json.success) {
      registerVote(json.elec_id, json.entry_id);
    }
  });

  template = RWTemplates.timeline.timeline();
  rootTemplate.timeline.parentNode.replaceChild(template.timeline, rootTemplate.timeline);
  rootTemplate.timeline_sizer = template.timeline_sizer;
  el = template.timeline_sizer;
  historyBar = template.history_bar;

  template.history_header_link.addEventListener('click', function () {
    Prefs.change('l_stk', !Prefs.get('l_stk'));
  });

  if (visibilityEventNames && visibilityEventNames.change && document.addEventListener) {
    document.addEventListener(visibilityEventNames.change, liveVotingVisibilityChange, false);
  }

  // Clock.pageclock_bar_function = progress_bar_update;
});

INIT_TASKS.on_draw.push(function () {
  scroller = Scrollbar.create(template.timeline, true);
  // if we don't do this, content can get cut off in the timeline
  // for browsers that don't need the custom scrollbars
  if (!Scrollbar.is_enabled) {
    scroller.set_height_original = scroller.set_height;
    scroller.set_height = function (h) {
      scroller.set_height_original(Math.max(h, Sizing.sizeableAreaHeight));
    };
  }
  rootTemplate.timeline = scroller.scrollblock;
});

var update = function () {
  const newEvents = [];

  for (var i = 0; i < events.length; i++) {
    events[i]._pending_delete = true;
  }

  // with history, [0] is the most recent song, so we start inserting from sched_history.length
  historyEvents = [];
  for (i = schedHistory.length - 1; i >= 0; i--) {
    schedHistory[i] = findAndUpdateEvent(schedHistory[i]);
    if (schedHistory[i].el.parentNode != el) {
      schedHistory[i].$t.progress.parentNode.removeChild(schedHistory[i].$t.progress);
    }
    schedHistory[i].changeToHistory();
    schedHistory[i].hideHeader();
    newEvents.push(schedHistory[i]);
    if (i === 0) {schedHistory[i].height += 8;}
  }

  schedCurrent = findAndUpdateEvent(schedCurrent);
  schedCurrent.changeToNowPlaying();
  newEvents.push(schedCurrent);

  let previousEvt = schedCurrent;
  let isContinuing = false;
  for (i = 0; i < schedNext.length; i++) {
    schedNext[i] = findAndUpdateEvent(schedNext[i]);
    if (
      previousEvt &&
      schedNext[i].core_event_id &&
      previousEvt.core_event_id === schedNext[i].core_event_id
    ) {
      isContinuing = true;
      // sched_next[i].hide_header();
    } else {
      isContinuing = false;
      // sched_next[i].show_header();
    }
    schedNext[i].changeToComingUp(isContinuing);
    newEvents.push(schedNext[i]);
    previousEvt = schedNext[i];
  }

  for (i = 0; i < events.length; i++) {
    if (events[i]._pending_delete) {
      events[i].el.style[Fx.transform] =
        `translateY(-${ 
        Sizing.songSizeNp + (Sizing.songSize * events[i].songs.length - 1) 
        }px)`;
      Fx.removeElement(events[i].el);
    }
  }

  events = newEvents;

  votingAllowedCheck();

  for (i = 0; i < events.length; i++) {
    if (events[i].el.parentNode != el) {
      el.appendChild(events[i].el);
    }
  }

  // The now playing bar
  Clock.setPageTitle(
    `${schedCurrent.songs[0].albums[0].name  } - ${  schedCurrent.songs[0].title}`,
    schedCurrent.end,
  );
};

// var progress_bar_update = function() {
// 	if (!sched_current) {
// 		return;
// 	}
// 	if ((sched_current.end - Clock.now) <= 0) {
// 		return;
// 	}
// 	var new_val = Math.min(Math.max(Math.floor(((sched_current.end - Clock.now) / (sched_current.songs[0].length - 1)) * 100), 0), 100);
// 	template.progress_history_inside.style.width = new_val + "%";
// };

const findEvent = function (id) {
  for (let i = 0; i < events.length; i++) {
    if (id == events[i].id) {
      return events[i];
    }
  }
  
return null;
};

var findAndUpdateEvent = function (eventJson) {
  const evt = findEvent(eventJson.id);
  if (!evt) {
    return RWEvent(eventJson);
  } else {
    evt.update(eventJson);
    evt._pending_delete = false;
    
return evt;
  }
};

const addMessage = function (id, text, notCloseable, noReflow) {
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].id == id) {
      return;
    }
  }

  const msg = {
    id: id,
    text: text,
    closeable: !notCloseable,
    closed: false,
  };
  RWTemplates.timeline.message(msg);
  msg.$t.el.style[Fx.transform] = 'translateY(-50px)';
  el.appendChild(msg.$t.el);
  messages.push(msg);
  if (msg.$t.close) {
    msg.$t.close.addEventListener('click', function (e) {
      e.stopPropagation();
      closeMessage(id);
    });
  }
  if (!noReflow) {
    reflow();
  }
  
return msg;
};

var closeMessage = function (id) {
  let msg;
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].id == id) {
      msg = messages[i];
      break;
    }
  }
  if (!msg) {
    return null;
  }
  if (msg.closed) {
    return null;
  }

  msg.closed = true;
  msg.$t.el.style[Fx.transform] = 'translateY(-50px)';
  setTimeout(function () {
    if (msg.$t.el.parentNode) {
      msg.$t.el.parentNode.removeChild(msg.$t.el);
    }
  }, 1000);
  reflow();

  return msg;
};

const removeMessage = function (id) {
  const msg = closeMessage(id);
  if (msg) {
    messages.splice(messages.indexOf(msg), 1);
  }
};

var reflow = function (reflowEverything) {
  if (!events.length) {return;}

  let i;
  if (reflowEverything) {
    for (i = 0; i < events.length; i++) {
      events[i].recalculateHeight();
      events[i].reflow();
    }
  }

  let runningY = 9;

  for (i = 0; i < messages.length; i++) {
    if (!messages[i].closed) {
      messages[i].$t.el.style[Fx.transform] = `translateY(${  runningY  }px)`;
      runningY += Sizing.timelineMessageSize + 5;
    }
  }

  template.history_header.style[Fx.transform] = `translateY(${  runningY  }px)`;

  const historySize = Prefs.get('l_stk') ? schedHistory.length : Prefs.get('l_stksz') || 0;
  if (historySize == schedHistory.length) {
    template.history_header.classList.remove('history-expandable');
  } else {
    template.history_header.classList.add('history-expandable');
  }

  historyBar.style[Fx.transform] = `translateY(${  runningY  }px)`;

  const hiddenEvents = Math.min(schedHistory.length, Math.max(0, schedHistory.length - historySize));
  for (i = 0; i < hiddenEvents && i < schedHistory.length; i++) {
    events[i].el.style[Fx.transform] =
      `translateY(${  -(((hiddenEvents - i - 1) * 5 + 1) * Sizing.songSize + 1)  }px)`;
    events[i].el.classList.add('sched-history-hidden');
  }

  runningY += 17;
  let historyGap;
  for (i = hiddenEvents; i < events.length; i++) {
    if (events[i].history) {
      events[i].el.classList.remove('sched-history-hidden');
    } else if (!historyGap) {
      historyGap = true;
      historyBar.style[Fx.transform] = `translateY(${  runningY + 9  }px)`;
      runningY += 19;
    }
    if (events[i].el.classList.contains('no-progress')) {
      events[i].el.classList.remove('no-progress');
    }
    // if (!events[i].showing_header && (i !== 0) && (!events[i - 1].el.classList.contains("no-header"))) {
    // 	events[i - 1].el.classList.add("no-progress");
    // 	runningY -= Sizing.timeline_header_size;
    // 	runningY += 16;
    // }
    events[i].el.style[Fx.transform] = `translateY(${  runningY  }px)`;
    runningY += events[i].height;
    if (Sizing.simple && !events[i].history) {runningY += 4;}
  }

  scroller.set_height(runningY);
};

var handleAlreadyVoted = function (json) {
  if (!events) {return;}
  for (let i = 0; i < json.length; i++) {
    registerVote(json[i][0], json[i][1]);
  }
};

var registerVote = function (eventId, entryId) {
  if (!events) {return;}
  let i, j;
  for (i = 0; i < events.length; i++) {
    if (events[i].id == eventId) {
      for (j = 0; j < events[i].songs.length; j++) {
        if (events[i].songs[j].entry_id == entryId) {
          events[i].songs[j].registerVote();
        }
      }
    }
  }
};

const rateCurrentSong = function (newRating) {
  if (schedCurrent.songs[0].rating_allowed || User.rate_anything) {
    Rating.doRating(newRating, schedCurrent.songs[0]);
  } else {
    throw { is_rw: true, tl_key: 'cannot_rate_now' };
  }
};

const favCurrent = function () {
  if (User.id > 1) {
    const e = document.createEvent('Events');
    e.initEvent('click', true, false);
    schedCurrent.songs[0].$t.fave.dispatchEvent(e);
  }
};

const vote = function (whichElection, songPosition) {
  if (whichElection < 0 || whichElection >= schedNext.length) {
    throw { is_rw: true, tl_key: 'invalid_hotkey_vote' };
  }

  if (schedNext[whichElection].type != 'election') {
    throw { is_rw: true, tl_key: 'not_an_election' };
  }

  if (!schedNext[whichElection].voting_allowed) {
    throw { is_rw: true, tl_key: 'cannot_vote_for_this_now' };
  }

  if (songPosition < 0 || songPosition > schedNext[whichElection].songs.length) {
    throw { is_rw: true, tl_key: 'invalid_hotkey_vote' };
  }

  schedNext[whichElection].songs[songPosition].vote();
};

var votingAllowedCheck = function () {
  if (!schedNext) {return;}
  if (!schedNext.length) {return;}
  for (let i = 0; i < schedNext.length; i++) {
    if (!schedNext[i].disableVoting) {
      // we haven't finished loading everything yet, short-circuit
      return;
    } else if (schedNext[i].type != 'election' || schedNext[i].songs.length <= 1) {
      schedNext[i].disableVoting();
    } else if (User.locked && User.lock_sid != User.sid) {
      schedNext[i].disableVoting();
    } else if (i === 0 && User.tuned_in) {
      schedNext[i].enableVoting();
    } else if (User.tuned_in && User.perks) {
      schedNext[i].enableVoting();
    } else {
      schedNext[i].disableVoting();
    }
  }
};

const getCurrentSongRating = function () {
  if (schedCurrent && schedCurrent.songs && schedCurrent.songs.length > 0) {
    return schedCurrent.songs[0].rating_user;
  }
  
return null;
};

const doEvent = function (json, sid) {
  let url;
  let sname;
  for (let i = 0; i < Stations.length; i++) {
    if (Stations[i].id == sid) {
      url = Stations[i].url;
      sname = Stations[i].name;
    }
  }
  const msg = addMessage(`event_${  sid}`, $l('special_event_alert', { station: sname }), false, true);
  // duplicate message
  if (!msg) {return;}
  const xmsg = document.createElement('span');
  xmsg.textContent = Formatting.eventName(json.event_type, json.event_name);
  msg.$t.message.appendChild(xmsg);
  msg.$t.el.addEventListener('click', function () {
    window.location.href = url;
  });
  msg.$t.el.style.cursor = 'pointer';
  
return msg;
};

var checkForEvents = function (json) {
  let sid;
  for (sid in json) {
    if (json[sid] && json[sid].event_name && sid != User.sid) {
      doEvent(json[sid], sid);
    } else if (!json[sid] || !json[sid].event_name) {
      closeMessage(`event_${  sid}`);
    }
  }
};

var lockCheck = function (json) {
  if (json.lock_in_effect && json.lock_sid != json.sid) {
    let lockedName, thisName;
    for (let i = 0; i < Stations.length; i++) {
      if (Stations[i].id == json.lock_sid) {
        lockedName = Stations[i].name;
      } else if (Stations[i].id == User.sid) {
        thisName = Stations[i].name;
      }
    }
    addMessage(
      'station_lock',
      $l('locked_to_station', {
        locked_station: lockedName,
        this_station: thisName,
        lock_counter: json.lock_counter,
      }),
      true,
      true,
    );
  } else {
    removeMessage('station_lock');
  }
};

// LIVE VOTING *******************************************************************************************

let lastLiveVote;

var liveVotingVisibilityChange = function () {
  if (!document.hidden) {
    if (lastLiveVote) {
      liveVoting(lastLiveVote);
    }
  }
};

var liveVoting = function (json) {
  if (document.hidden) {
    lastLiveVote = json;
    
return;
  }
  lastLiveVote = null;
  for (let i = 0; i < events.length; i++) {
    if (json[events[i].id]) {
      events[i].liveVoting(json[events[i].id]);
    }
  }
};

export {
  update,
  addMessage,
  closeMessage,
  removeMessage,
  reflow,
  handleAlreadyVoted,
  registerVote,
  rateCurrentSong,
  favCurrent,
  vote,
  votingAllowedCheck,
  getCurrentSongRating,
};
