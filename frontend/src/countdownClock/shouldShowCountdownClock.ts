import { preferences } from '../preferences';

function shouldShowClockInTitle(): boolean {
  if (preferences.showClockInTitle === 'on') {
    return true;
  }

  if (preferences.powerUserMode && preferences.showClockInTitle === 'default') {
    return true;
  }

  return false;
}

export { shouldShowClockInTitle };
