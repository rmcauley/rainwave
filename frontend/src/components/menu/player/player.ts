import { getAlbumArt } from '../../../helpers/albumArt';
import { stations } from '../../../helpers/stations';
import { $l } from '../../../language';
import { preferences, setPreference } from '../../../preferences';
import { api } from '../../../rainwaveApi';

import { RainwaveAudioBackend } from './playerBackend';

import type { components } from '../../../rainwaveApi/rainwave-openapi';

import './player.scss';

function sanitizeVolume(newVolume: number): number {
  if (!Number.isFinite(newVolume)) {
    return 1;
  }

  return Math.min(Math.max(newVolume, 0), 1);
}

function initPlayer(): void {
  const relay = window.BOOTSTRAP.relays[0]!;
  const audioUrl = `${relay.protocol}://${relay.hostname}:${relay.port}/${stations[api.user.sid]!.url}?${api.user.id}:${api.user.listen_key}`;
  const player = new RainwaveAudioBackend(audioUrl, document.getElementById('measure-box')!);

  const el = document.getElementById('player')!;
  const volumeEl = document.getElementById('player-body-volume')!;
  const volumeRect = document.getElementById('player-body-volume-svg-bars')!;
  const loadingEl = document.getElementById('player-load-indicator')!;
  const playEl = document.getElementById('player-body-play')!;
  const stopEl = document.getElementById('player-body-stop')!;
  const muteEl = document.getElementById('player-body-mute')!;
  let volume = sanitizeVolume(preferences.volume);
  let isMuted = preferences.muted;

  function clearAudioErrors(): void {
    // ErrorHandler.removePermanentError('audio_error');
    // ErrorHandler.removePermanentError('audio_connect_error');
    loadingEl.classList.remove('loading');
  }

  function drawVolume(): void {
    volumeRect.setAttribute('width', (100 * Math.pow(volume, 1 / 4)).toString());
  }

  function drawMute(): void {
    if (isMuted) {
      el.classList.add('muted');
    } else {
      el.classList.remove('muted');
    }
  }

  function applyOutputVolume(): void {
    player.setOutputVolume(isMuted ? 0 : volume);
  }

  function setVolume(newVolume: number): void {
    volume = sanitizeVolume(newVolume);
    drawVolume();
    setPreference('volume', volume);
    applyOutputVolume();
  }

  function toggleMute(): void {
    isMuted = !isMuted;
    drawMute();
    setPreference('muted', isMuted);
    applyOutputVolume();
  }

  function updatePlayerState(): void {
    const { state } = player.snapshot;

    el.classList.toggle('playing', state === 'playing');
    loadingEl.classList.toggle(
      'loading',
      state === 'connecting' || state === 'buffering' || state === 'retrying',
    );

    if (state === 'failed') {
      const a = document.createElement('a');
      a.setAttribute('href', `/tune_in/${api.user.sid}.mp3`);
      a.className = 'link obvious';
      a.textContent = $l('try_external_player');
      a.addEventListener('click', function () {
        clearAudioErrors();
      });
      // ErrorHandler.nonpermanentError(ErrorHandler.makeError('audio_error', 500), a);
    }
  }

  function changeVolumeFromMouse(evt: MouseEvent): void {
    const x = evt.offsetX;
    let hPos = Math.min(Math.max(x / volumeEl.offsetWidth, 0), 1);
    if (hPos < 0.05) {
      hPos = 0;
    }
    if (hPos > 0.95) {
      hPos = 1;
    }
    if (!hPos || isNaN(hPos)) {
      hPos = 0;
    }
    setVolume(Math.pow(hPos, 4));
  }

  function volumeControlMouseup(): void {
    volumeEl.removeEventListener('mousemove', changeVolumeFromMouse);
    document.removeEventListener('mouseup', volumeControlMouseup);
  }

  function volumeControlMousedown(evt: MouseEvent): void {
    if (evt.button !== 0) {
      return;
    }
    changeVolumeFromMouse(evt);
    if (isMuted) {
      toggleMute();
    }
    volumeEl.addEventListener('mousemove', changeVolumeFromMouse);
    document.addEventListener('mouseup', volumeControlMouseup);
  }

  api.addEventListener('user', (user) => {
    if (user.tuned_in) {
      document.body.classList.add('tuned-in');
    } else {
      document.body.classList.remove('tuned-in');
    }
    if (!player.isActive) {
      return;
    }

    if (user.tuned_in) {
      clearAudioErrors();
    }
  });

  volumeEl.addEventListener('mousedown', volumeControlMousedown);
  muteEl.addEventListener('click', toggleMute);
  playEl.addEventListener('click', player.playToggle);
  stopEl.addEventListener('click', player.stop);
  player.addEventListener('stateChange', updatePlayerState);

  if (navigator.mediaSession) {
    function updateMediaSession(nowPlaying: components['schemas']['sched_current']): void {
      const song = nowPlaying.songs[0];
      if (!song || !api.user.tuned_in) {
        return;
      }
      const artwork = [
        {
          src: new URL(getAlbumArt(song), window.location.origin).toString(),
          sizes: '320x320',
          type: 'image/jpeg',
        },
      ];

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artists.map((artist) => artist.name).join(', '),
        album: song.albums[0].name,
        artwork: artwork,
      });
    }

    api.addEventListener('sched_current', updateMediaSession);

    navigator.mediaSession.setActionHandler('play', player.play);
    navigator.mediaSession.setActionHandler('pause', player.stop);
    navigator.mediaSession.setActionHandler('previoustrack', function () {});
    navigator.mediaSession.setActionHandler('nexttrack', function () {});
    navigator.mediaSession.setActionHandler('seekbackward', function () {});
    navigator.mediaSession.setActionHandler('seekforward', function () {});
  }

  drawVolume();
  drawMute();
  applyOutputVolume();
  updatePlayerState();
}

export { initPlayer };
