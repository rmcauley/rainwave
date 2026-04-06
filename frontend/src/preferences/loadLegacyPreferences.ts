import { DEFAULT_PREFERENCES } from './defaultPreferences';

import type { Preferences } from './preferenceTypes';

const LEGACY_COOKIE_KEY = 'r5_prefs';

const translateR5: Record<string, keyof Preferences> = {
  vol: 'volume',
  pwr: 'powerUserMode',
  robot: 'useRobotoFont',
  notify: 'enableNotifications',
  r_incmplt: 'indicateIncompleteAlbums',
  r_noglbl: 'hideGlobalRatings',
  r_clear: 'showDeleteRatingButton',
  t_clk: 'showClockInTitle',
  t_tl: 'showSongInTitle',
  p_sort: 'playlistSort',
  p_null1: 'playlistUnratedFirst',
  p_favup: 'playlistFavesFirst',
  p_avup: 'playlistAvailableFirst',
  p_fav1: 'playlistFavesAboveAvailable',
  p_songsort: 'playlistSortSongsLikeAlbums',
  l_stk: 'showPreviousElections',
  l_stksz: 'showHowManyPreviousElections',
};

let legacyPreferences: Preferences;

const legacyPrefsCookie = document.cookie
  .split('; ')
  .find((entry) => entry.startsWith(`${LEGACY_COOKIE_KEY}=`));
if (legacyPrefsCookie) {
  try {
    const legacyValue = legacyPrefsCookie.substring(LEGACY_COOKIE_KEY.length + 1);
    if (legacyValue) {
      const legacy = JSON.parse(decodeURIComponent(legacyValue)) as unknown;
      if (legacy && typeof legacy === 'object') {
        legacyPreferences = { ...DEFAULT_PREFERENCES };

        Object.entries(legacy as Record<string, string>).forEach(([key, value]) => {
          const mappedKey = translateR5[key];
          if (!mappedKey) {
            return;
          }

          if (mappedKey === 'volume') {
            legacyPreferences.volume = parseFloat(value);
          } else if (mappedKey === 'playlistSort') {
            legacyPreferences.playlistSort = value === 'rt' ? 'rating' : 'alphabetical';
          } else if (mappedKey === 'showHowManyPreviousElections') {
            legacyPreferences.showHowManyPreviousElections = parseInt(value);
          } else if (mappedKey === 'showClockInTitle') {
            legacyPreferences.showClockInTitle = 'default';
          } else {
            legacyPreferences[mappedKey] = value === 'true' ? true : false;
          }
        });
      }
    }
  } catch (e) {
    // Allow console logging this for debugging.
    // eslint-disable-next-line no-console
    console.warn('Preferences could not be loaded from cookie.  Preferences reset.');
    // eslint-disable-next-line no-console
    console.error(e);
  } finally {
    document.cookie = `${LEGACY_COOKIE_KEY}=; Max-Age=0; path=/`;
  }
}

export { legacyPreferences };
