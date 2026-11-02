import type { RainwaveLocale } from '../language/translations';

interface Preferences {
  locale: RainwaveLocale;
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
  playlistSortSongsLikeAlbums: boolean;
  showAllPreviousElections: boolean;
  permanentlyVisiblePreviousElections: number;
  showSongsThatLostElection: boolean;
}

interface PreferenceChange<K extends keyof Preferences = keyof Preferences> {
  key: K;
  value: Preferences[K];
  previous: Preferences[K];
}

export type { Preferences, PreferenceChange };
