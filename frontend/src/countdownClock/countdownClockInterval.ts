import { preferences } from '../preferences';
import { countdownClockLoop } from './countdownClock';
import { shouldShowClockInTitle } from './shouldShowClockInTitle';

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
  if (shouldShowClockInTitle()) {
    enableCountdownClock();
  } else {
    disableCountdownClock();
  }
}

function registerCountdownClock(): void {
  preferences.addEventListener('showClockInTitle', changeCountdownClockEnabled);
  document.addEventListener('visibilitychange', changeCountdownClockEnabled);
}

export { registerCountdownClock };
