import { formatSongLength } from '../helpers/formatSongLength';
import { getServerTime } from '../helpers/serverTime';
import { preferences } from '../preferences/preferences';
import { api } from '../rainwaveApi/api';
import { shouldShowClockInTitle } from './shouldShowClockInTitle';

const countdownListeners: Array<(nowPlayingEndsAt: number, minuteClock: string) => void> = [];
function addCountdownListener(callback: (typeof countdownListeners)[number]): void {
  countdownListeners.push(callback);
}

const originalTitle = document.title;
let nowPlayingTitle = '';
let nowPlayingEndsAt = 0;
api.addEventListener('sched_current', (nowPlaying) => {
  const song = nowPlaying.songs[0];
  if (!song) {
    return;
  }
  nowPlayingTitle = `${song.albums[0].name} - ${song.title}`;
  nowPlayingEndsAt = nowPlaying.end;
});

function countdownClockLoop(): void {
  if (nowPlayingEndsAt < 0) {
    return;
  }

  const now = getServerTime();
  const minuteClock = formatSongLength(nowPlayingEndsAt - now);

  if (!document.hidden) {
    countdownListeners.forEach((countdownListener) => {
      countdownListener(nowPlayingEndsAt, minuteClock);
    });
  }

  if (!shouldShowClockInTitle()) {
    if (document.title !== originalTitle) {
      document.title = originalTitle;
    }

    return;
  }

  let thisPageTitle = nowPlayingTitle;
  if (preferences.store.showClockInTitle) {
    thisPageTitle = `[${minuteClock}] ${thisPageTitle}`;
  }
  if (thisPageTitle !== document.title) {
    document.title = thisPageTitle;
  }
}

export { addCountdownListener, countdownClockLoop };
