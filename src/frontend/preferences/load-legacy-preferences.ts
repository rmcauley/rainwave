import { DEFAULT_PREFERENCES } from './default-preferences';

import type { Preferences } from './preferences-types';

const LEGACY_COOKIE_KEY = 'r5_prefs';

const translateR5: Record<string, keyof Preferences> = {
  vol: 'volume',
  pwr: 'powerUserMode',
  robot: 'useRobotoFont',
  f_norm: 'shrinkFontWithScreenWidth',
  notify: 'enableNotifications',
  r_incmplt: 'indicateIncompleteAlbums',
  r_noglbl: 'hideGlobalRatings',
  r_clear: 'showDeleteRatingButton',
  t_rt: 'showRatingInTitle',
  t_clk: 'showClockInTitle',
  t_tl: 'showSongInTitle',
  p_sort: 'playlistSort',
  p_null1: 'playlistUnratedFirst',
  p_favup: 'playlistFavesFirst',
  p_avup: 'playlistAvailableFirst',
  p_fav1: 'playlistFavesAboveAvailable',
  p_songsort: 'playlistSortSongsLikeAlbums',
  hkm: 'hotkeyLayout',
  l_stk: 'showPreviousElections',
  l_stksz: 'showHowManyPreviousElections',
  l_displose: 'showSongsThatLostElection',
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
          } else if (mappedKey === 'hotkeyLayout' && value === 'AZER') {
            legacyPreferences.hotkeyLayout = 'AZER';
          } else if (mappedKey === 'hotkeyLayout' && value === 'DVOR') {
            legacyPreferences.hotkeyLayout = 'DVOR';
          } else if (mappedKey === 'hotkeyLayout') {
            legacyPreferences.hotkeyLayout = 'QWER';
          } else if (mappedKey === 'showHowManyPreviousElections') {
            legacyPreferences.showHowManyPreviousElections = parseInt(value);
          } else {
            legacyPreferences[mappedKey] = value === 'true' ? true : false;
          }
        });
      }
    }
  } catch (e) {
    // Allow console logging this for debugging.
    // eslint-disable-next-line no-console
    console.error('Preferences could not be loaded from cookie.  Preferences reset.', e);
  } finally {
    document.cookie = `${LEGACY_COOKIE_KEY}=; Max-Age=0; path=/`;
  }
}

export { legacyPreferences };
