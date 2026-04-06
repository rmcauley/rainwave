const RWAudioConstructor = function () {
  // this file uses RainwavePlayer which confirms to Javascript standards
  // unlike the rest of my codebase
  // furthermore it was all hacked in
  // so expect the worst in variable naming mixing

  const player = RainwavePlayer;
  player.debug = true;
  if (!player.isSupported) {return;}

  let el;
  let volumeEl;
  let volumeRect;
  let volumeContainer;
  let muteEl;
  const offsetWidth = 54; // taken straight from the CSS for #audio_volume
  let offsetLeft;
  let lastUserTuneinCheck = 0;
  let nowPlaying;
  const iOSAppMode =
    window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rainwavePlay;

  if (iOSAppMode) {
    player.play = function () {
      window.webkit.messageHandlers.rainwavePlay.postMessage(User.sid);
    };

    player.stop = function () {
      window.webkit.messageHandlers.rainwaveStop.postMessage(User.sid);
    };

    player.useStreamURL = function (streamURL) {
      window.webkit.messageHandlers.rainwaveUseStreamURLs.postMessage(streamURL);
    };
  }

  INIT_TASKS.on_init.push(function (rootTemplate) {
    player.audioElDest = rootTemplate.measure_box;

    rootTemplate.volume_container = document.getElementById('audio_volume_container');
    rootTemplate.volume = document.getElementById('audio_volume');
    rootTemplate.volume_indicator = document.getElementById('audio_volume_indicator');
    rootTemplate.volume.style.display = '';
    rootTemplate.mute.parentNode.appendChild(rootTemplate.volume_container);

    rootTemplate.volume.addEventListener('mousedown', volumeControlMousedown);
    rootTemplate.mute.addEventListener('click', player.toggleMute);
    rootTemplate.play.addEventListener('click', player.playToggle);
    rootTemplate.play2.addEventListener('click', player.play);
    rootTemplate.stop.addEventListener('click', player.stop);

    el = rootTemplate.player;
    volumeEl = rootTemplate.volume;
    volumeRect = rootTemplate.volume_indicator;
    volumeContainer = rootTemplate.volume_container;

    let streamQuery = '';
    if (User && User.listen_key) {
      streamQuery += `?${  User.id  }:${  User.listen_key}`;
    }
    player.useStation(User.sid, streamQuery);

    api.addEventListener('user', userTuneinCheck);
    api.addEventListener('sched_current', function (np) {
      nowPlaying = np;
      if (msUpdateMetadata) {
        msUpdateMetadata();
      }
    });

    Prefs.define('vol', [1.0]);
    drawVolume(Prefs.get('vol'));
  });

  var userTuneinCheck = function (json) {
    if (json.tuned_in) {
      document.body.classList.add('tuned-in');
    } else {
      document.body.classList.remove('tuned-in');
    }
    if (!player.isPlaying) {return;}
    if (lastUserTuneinCheck < Clock.now - 300) {
      lastUserTuneinCheck = parseInt(Clock.now);
      if (!json.tuned_in) {
        ErrorHandler.removePermanentError('audio_connect_error_reattempting');
        ErrorHandler.removePermanentError('chrome_mobile_takes_time');
        player.stop();
        setTimeout(player.play, 300);
      }
    }

    if (json.tuned_in) {
      clearAudioErrors();
    }
  };

  var clearAudioErrors = function () {
    ErrorHandler.removePermanentError('m3u_hijack_right_click');
    ErrorHandler.removePermanentError('audio_error');
    ErrorHandler.removePermanentError('audio_connect_error');
    el.classList.remove('working');
  };

  if (!Prefs.get('vol') || Prefs.get('vol') > 1 || Prefs.get('vol') < 0) {
    player.setVolume(0.85);
  } else {
    player.setVolume(Prefs.get('vol'));
  }
  player.addEventListener('volumeChange', function () {
    if (player.isMuted) {
      el.classList.add('muted');
    } else {
      el.classList.remove('muted');
    }
    Prefs.change('vol', player.volume);
    drawVolume(player.volume);
  });

  player.addEventListener('stop', function () {
    el.classList.remove('playing');
    clearAudioErrors();
    ErrorHandler.removePermanentError('chrome_mobile_takes_time');
  });

  player.addEventListener('loading', function () {
    el.classList.add('working');
  });

  player.addEventListener('playing', function () {
    el.classList.add('playing');
    el.classList.remove('working');
    ErrorHandler.removePermanentError('chrome_mobile_takes_time');
    clearAudioErrors();
  });

  player.addEventListener('stall', function () {
    el.classList.add('working');
    // var append;
    // if (evt.detail) {
    // 	append = document.createElement("span");
    // 	append.textContent = evt.detail;
    // }
    ErrorHandler.permanentError(ErrorHandler.makeError('audio_connect_error', 500)); // , append);
  });

  player.addEventListener('error', function () {
    player.stop();
    const a = document.createElement('a');
    a.setAttribute('href', `/tune_in/${  User.sid  }.mp3`);
    a.className = 'link obvious';
    a.textContent = $l('try_external_player');
    a.addEventListener('click', function () {
      clearAudioErrors();
    });
    ErrorHandler.nonpermanentError(ErrorHandler.makeError('audio_error', 500), a);
  });

  var volumeControlMousedown = function (evt) {
    if (evt.button !== 0) {return;}
    let node = volumeContainer;
    offsetLeft = node.offsetLeft;
    while ((node = node.parentNode)) {
      if (node.offsetLeft) {
        offsetLeft += node.offsetLeft;
      }
    }
    changeVolumeFromMouse(evt);
    if (player.isMuted) {
      player.toggleMute();
    }
    volumeEl.addEventListener('mousemove', changeVolumeFromMouse);
    document.addEventListener('mouseup', volumeControlMouseup);
  };

  var volumeControlMouseup = function () {
    volumeEl.removeEventListener('mousemove', changeVolumeFromMouse);
    document.removeEventListener('mouseup', volumeControlMouseup);
  };

  var changeVolumeFromMouse = function (evt) {
    let x = evt.pageX ? evt.pageX : evt.clientX;
    x = x - 5;
    let hPos = Math.min(Math.max((x - offsetLeft) / offsetWidth, 0), 1);
    if (hPos < 0.05) {hPos = 0;}
    if (hPos > 0.95) {hPos = 1;}
    if (!hPos || isNaN(hPos)) {hPos = 0;}
    player.setVolume(Math.pow(hPos, 4));
  };

  var drawVolume = function (v) {
    volumeRect.setAttribute('width', 100 * Math.sqrt(v, 4));
  };

  player.detectHijack = function () {
    if (navigator.plugins && navigator.plugins.length > 0) {
      for (let i = 0; i < navigator.plugins.length; i++) {
        if (navigator.plugins[i]) {
          for (let j = 0; j < navigator.plugins[i].length; j++) {
            if (navigator.plugins[i][j].type) {
              if (navigator.plugins[i][j].type == 'audio/x-mpegurl')
                {return navigator.plugins[i][j].enabledPlugin.name;}
            }
          }
        }
      }
    }
    
return false;
  };

  if (navigator.mediaSession) {
    const msPlay = function () {
      const promise = player.play();
      if (promise && promise.then) {
        promise.then(msUpdateMetadata);
      }
    };

    var msUpdateMetadata = function () {
      const song = nowPlaying.songs[0];
      const artExists = song.albums[0].art ? true : false;
      const artUrl =
        `https://rainwave.cc${  nowPlaying.songs[0].albums[0].art || 'static/images4/noart_1.jpg'}`;
      const artwork = [
        {
          src: artUrl + (artExists ? '_320.jpg' : ''),
          sizes: '320x320',
          type: 'image/jpeg',
        },
      ];

      const artists = [];
      for (let i = 0; i < song.artists.length; i++) {
        artists.push(song.artists[i].name);
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: artists.join(', '),
        album: song.albums[0].name,
        artwork: artwork,
      });
    };

    navigator.mediaSession.setActionHandler('play', msPlay);
    navigator.mediaSession.setActionHandler('pause', player.stop);
    navigator.mediaSession.setActionHandler('previoustrack', msPlay);
    navigator.mediaSession.setActionHandler('nexttrack', msPlay);
    navigator.mediaSession.setActionHandler('seekbackward', function () {});
    navigator.mediaSession.setActionHandler('seekforward', function () {});
  }

  return player;
};

export { RWAudioConstructor };
