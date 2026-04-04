import { countdownClockLoop } from '.';

import { isProbablyMobileBrowser } from '../helpers/is-probably-mobile';
import { preferenceEvents } from '../preferences';

import { shouldShowClockInTitle } from './shouldShowCountdownClock';

let interval: ReturnType<typeof setInterval> | null = null;

function enableCountdownClock(): void {
  if (!interval) {
    countdownClockLoop();
    interval = setInterval(countdownClockLoop, 1000);
  }
}

function disableCountdownClock(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function changeCountdownClockEnabled(): void {
  if (isProbablyMobileBrowser() && document.hidden) {
    disableCountdownClock();

    return;
  }

  if (shouldShowClockInTitle()) {
    enableCountdownClock();

    return;
  }

  if (document.hidden) {
    disableCountdownClock();

    return;
  }

  enableCountdownClock();
}

function registerCountdownClock(): void {
  preferenceEvents.addEventListener('showClockInTitle', changeCountdownClockEnabled);
  document.addEventListener('visibilitychange', changeCountdownClockEnabled);
}

export { registerCountdownClock };
