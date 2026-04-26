import type { Preferences } from './preferenceTypes';

const DEFAULT_PREFERENCES: Preferences = {
  volume: 1,
  muted: false,
  powerUserMode: false,
  enableNotifications: false,
  indicateIncompleteAlbums: false,
  hideGlobalRatings: false,
  showDeleteRatingButton: false,
  showClockInTitle: 'default',
  showSongInTitle: true,
  playlistSort: 'alphabetical',
  playlistUnratedFirst: false,
  playlistFavesFirst: false,
  playlistAvailableFirst: false,
  playlistFavesAboveAvailable: false,
  playlistSortSongsLikeAlbums: false,
  showPreviousElections: false,
  showHowManyPreviousElections: 5,
};

export { DEFAULT_PREFERENCES };
