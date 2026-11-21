import { stations } from '../../../helpers/stations';
import { $l } from '../../../language';
import { preferences } from '../../../preferences/preferences';
import { api } from '../../../rainwaveApi/api';
import { removeSystemMessage, showSystemMessage } from '../../systemMessages/systemMessages';
import { RainwaveAudioBackend } from './playerBackend';

import './player.css';
import { updateMediaSession } from './updateMediaSession';

function sanitizeVolume(newVolume: number): number {
  if (!Number.isFinite(newVolume)) {
    return 1;
  }

  return Math.min(Math.max(newVolume, 0), 1);
}

function initPlayer(): void {
  const relay = window.BOOTSTRAP.relays[0]!;
  const audioUrl = `${relay.protocol}://${relay.hostname}:${relay.port}/${stations.get(api.user.sid)!.url}?${api.user.id}:${api.user.listen_key}`;
  const player = new RainwaveAudioBackend(audioUrl, document.getElementById('measure-box')!);

  const el = document.getElementById('player')!;
  const volumeEl = document.getElementById('player-body-volume')!;
  const volumeRect = document.getElementById('player-body-volume-svg-value')!;
  const loadingEl = document.getElementById('player-load-indicator')!;
  const playEl = document.getElementById('player-body-play')!;
  const stopEl = document.getElementById('player-body-stop')!;
  const muteEl = document.getElementById('player-body-mute')!;
  let volume = sanitizeVolume(preferences.store.volume);
  let isMuted = preferences.store.muted;

  function clearAudioErrors(): void {
    removeSystemMessage('audio-error');
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
    preferences.set('volume', volume);
    applyOutputVolume();
  }

  function toggleMute(): void {
    isMuted = !isMuted;
    drawMute();
    preferences.set('muted', isMuted);
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
      showSystemMessage('audio-error', a, true);
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
    volumeEl.removeEventListener('pointermove', changeVolumeFromMouse);
    document.removeEventListener('pointerup', volumeControlMouseup);
  }

  function volumeControlMousedown(evt: MouseEvent): void {
    if (evt.button !== 0) {
      return;
    }
    changeVolumeFromMouse(evt);
    if (isMuted) {
      toggleMute();
    }
    volumeEl.addEventListener('pointermove', changeVolumeFromMouse);
    document.addEventListener('pointerup', volumeControlMouseup);
  }

  api.addEventListener('user', (user) => {
    if (user.tuned_in) {
      el.classList.add('tuned-in');
    } else {
      el.classList.remove('tuned-in');
    }
    if (!player.isActive) {
      return;
    }

    if (user.tuned_in) {
      clearAudioErrors();
    }
  });

  volumeEl.addEventListener('pointerdown', volumeControlMousedown);
  muteEl.addEventListener('click', toggleMute);
  playEl.addEventListener('click', player.playToggle);
  stopEl.addEventListener('click', player.stop);
  player.addEventListener('stateChange', updatePlayerState);

  api.addEventListener('sched_current', updateMediaSession);

  navigator.mediaSession.setActionHandler('play', player.play);
  navigator.mediaSession.setActionHandler('pause', player.stop);
  navigator.mediaSession.setActionHandler('previoustrack', function () {});
  navigator.mediaSession.setActionHandler('nexttrack', function () {});
  navigator.mediaSession.setActionHandler('seekbackward', function () {});
  navigator.mediaSession.setActionHandler('seekforward', function () {});

  drawVolume();
  drawMute();
  applyOutputVolume();
  updatePlayerState();
}

export { initPlayer };
