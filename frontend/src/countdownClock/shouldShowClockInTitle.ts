import { isProbablyMobileBrowser } from '../helpers/isProbablyMobile';
import { preferences } from '../preferences';

function shouldShowClockInTitle(): boolean {
  if (isProbablyMobileBrowser()) {
    return false;
  } else if (preferences.store.showClockInTitle === 'on') {
    return true;
  } else if (preferences.store.powerUserMode && preferences.store.showClockInTitle === 'default') {
    return true;
  }
  return false;
}

export { shouldShowClockInTitle };
