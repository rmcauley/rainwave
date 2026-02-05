interface Preferences {
  volume: number;
  powerUserMode: boolean;
  useRobotoFont: boolean;
  shrinkFontWithScreenWidth: boolean;
  enableNotifications: boolean;
  indicateIncompleteAlbums: boolean;
  hideGlobalRatings: boolean;
  showDeleteRatingButton: boolean;
  showRatingInTitle: boolean;
  showClockInTitle: boolean;
  showSongInTitle: boolean;
  playlistSort: 'alphabetical' | 'rating';
  playlistUnratedFirst: boolean;
  playlistFavesFirst: boolean;
  playlistAvailableFirst: boolean;
  playlistFavesAboveAvailable: boolean;
  playlistSortSongsLikeAlbums: boolean;
  hotkeyLayout: 'QWER' | 'AZER' | 'DVOR';
  showPreviousElections: boolean;
  showHowManyPreviousElections: number;
  showSongsThatLostElection: boolean;
}

interface PreferenceChange<K extends keyof Preferences = keyof Preferences> {
  key: K;
  value: Preferences[K];
  previous: Preferences[K];
}

const POWER_MODE_ONLY_PREFERENCES: Array<keyof Preferences> = [
  'shrinkFontWithScreenWidth',
  'indicateIncompleteAlbums',
  'hideGlobalRatings',
  'showDeleteRatingButton',
  'showRatingInTitle',
  'playlistSort',
  'playlistUnratedFirst',
  'playlistFavesFirst',
  'playlistAvailableFirst',
  'playlistFavesAboveAvailable',
  'playlistSortSongsLikeAlbums',
  'hotkeyLayout',
  'showPreviousElections',
  'showHowManyPreviousElections',
];

export { POWER_MODE_ONLY_PREFERENCES };

export type { Preferences, PreferenceChange };
