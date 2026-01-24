import { api } from '../api';
import { preferences } from '../preferences';

import { getServerTime } from './clock';
import { formatRating, getMinuteClock } from './formatting';

let interval: ReturnType<typeof setInterval> | null = null;

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

function loop(): void {
  if (nowPlayingEndsAt <= 0) {
    return;
  }

  const now = getServerTime();
  const minuteClock = getMinuteClock(nowPlayingEndsAt - now);

  if (nowPlayingCountdownClock && nowPlayingEndsAt - now >= 0) {
    nowPlayingCountdownClock.textContent = minuteClock;
  }

  if (nowPlayingCountdownCallback && !document.hidden) {
    nowPlayingCountdownCallback(nowPlayingEndsAt, now);
  }

  if (
    bootstrap.mobile ||
    (Sizing.simple && (!preferences.showRatingInTitle || !nowPlayingTitle || !User.tuned_in))
  ) {
    if (document.title != originalTitle) {
      document.title = originalTitle;
    }

    return;
  } else if (!Sizing.simple && !preferences.showRatingInTitle) {
    if (document.title != originalTitle) {
      document.title = originalTitle;
    }

    return;
  }

  let thisPageTitle = nowPlayingTitle;
  if (preferences.showRatingInTitle) {
    const rating = Timeline.get_current_song_rating();
    if (rating) {
      thisPageTitle = '[' + formatRating(rating) + '] ' + thisPageTitle;
    } else {
      thisPageTitle = '*** ' + thisPageTitle;
    }
  }
  if (preferences.showClockInTitle) {
    thisPageTitle = '[' + minuteClock + '] ' + thisPageTitle;
  }
  if (thisPageTitle != document.title) {
    document.title = thisPageTitle;
  }
}

function handleVisibilityChange(): void {
  if (document.hidden) {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
  } else {
    loop();
    if (!interval) {
      interval = setInterval(loop, 1000);
    }
  }
}

if (!interval) {
  interval = setInterval(loop, 1000);
}

// Only handle browser closing/opening on mobile.
// We want the browser tab title to change on desktop even when the tab is not visible.
if (bootstrap.mobile) {
  document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });
}

export { setNowPlayingCountdownClock, setNowPlayingCountdownCallback };
