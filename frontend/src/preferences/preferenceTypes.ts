interface Preferences {
  volume: number;
  muted: boolean;
  powerUserMode: boolean;
  enableNotifications: boolean;
  indicateIncompleteAlbums: boolean;
  hideGlobalRatings: boolean;
  showDeleteRatingButton: boolean;
  showClockInTitle: 'default' | 'on' | 'off';
  showSongInTitle: boolean;
  playlistSort: 'alphabetical' | 'rating';
  playlistUnratedFirst: boolean;
  playlistFavesFirst: boolean;
  playlistAvailableFirst: boolean;
  playlistFavesAboveAvailable: boolean;
  playlistSortSongsLikeAlbums: boolean;
  showPreviousElections: boolean;
  showHowManyPreviousElections: number;
}

interface PreferenceChange<K extends keyof Preferences = keyof Preferences> {
  key: K;
  value: Preferences[K];
  previous: Preferences[K];
}

const POWER_MODE_ONLY_PREFERENCES: Array<keyof Preferences> = [
  'indicateIncompleteAlbums',
  'hideGlobalRatings',
  'showDeleteRatingButton',
  'playlistSort',
  'playlistUnratedFirst',
  'playlistFavesFirst',
  'playlistAvailableFirst',
  'playlistFavesAboveAvailable',
  'playlistSortSongsLikeAlbums',
  'showPreviousElections',
  'showHowManyPreviousElections',
];

export { POWER_MODE_ONLY_PREFERENCES };

export type { Preferences, PreferenceChange };
