import { getServerTime } from '../helpers/clock';
import { preferences } from '../preferences';
import { api } from '../rainwaveApi';

import { getCountdownClockFormatted } from './countdownClockFormat';
import { shouldShowClockInTitle } from './shouldShowCountdownClock';

// Countdown clock HTML element
let nowPlayingCountdownClock: HTMLElement | null = null;
function setNowPlayingCountdownClock(el: HTMLElement): void {
  nowPlayingCountdownClock = el;
}

let nowPlayingCountdownCallback: ((end: number, now: number) => void) | undefined;
function setNowPlayingCountdownCallback(
  callback: NonNullable<typeof nowPlayingCountdownCallback>,
): void {
  nowPlayingCountdownCallback = callback;
}

const originalTitle = document.title;
let nowPlayingTitle = '';
let nowPlayingEndsAt = 0;
api.addEventListener('sched_current', (nowPlaying) => {
  nowPlayingTitle = nowPlaying.songs[0]!.albums[0].name + ' - ' + nowPlaying.songs[0]!.title;
  nowPlayingEndsAt = nowPlaying.end;
});

function countdownClockLoop(): void {
  if (nowPlayingEndsAt <= 0) {
    return;
  }

  const now = getServerTime();
  const minuteClock = getCountdownClockFormatted(nowPlayingEndsAt - now);

  if (nowPlayingCountdownClock && nowPlayingEndsAt - now >= 0) {
    nowPlayingCountdownClock.textContent = minuteClock;
  }

  if (nowPlayingCountdownCallback && !document.hidden) {
    nowPlayingCountdownCallback(nowPlayingEndsAt, now);
  }

  if (!shouldShowClockInTitle()) {
    if (document.title != originalTitle) {
      document.title = originalTitle;
    }

    return;
  }

  let thisPageTitle = nowPlayingTitle;
  if (preferences.showClockInTitle) {
    thisPageTitle = '[' + minuteClock + '] ' + thisPageTitle;
  }
  if (thisPageTitle != document.title) {
    document.title = thisPageTitle;
  }
}

export { setNowPlayingCountdownClock, setNowPlayingCountdownCallback, countdownClockLoop };
