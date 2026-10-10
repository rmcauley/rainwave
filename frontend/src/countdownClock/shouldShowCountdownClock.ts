import { preferences } from '../preferences';

function shouldShowClockInTitle(): boolean {
  if (preferences.store.showClockInTitle === 'on') {
    return true;
  }

  if (preferences.store.powerUserMode && preferences.store.showClockInTitle === 'default') {
    return true;
  }

  return false;
}

export { shouldShowClockInTitle };
