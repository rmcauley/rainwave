import type { Preferences } from './preferenceTypes';

const DEFAULT_PREFERENCES: Preferences = {
  locale: 'en-CA',
  showSongsThatLostElection: false,
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
  playlistSortSongsLikeAlbums: false,
  showAllPreviousElections: false,
  permanentlyVisiblePreviousElections: 0,
};

export { DEFAULT_PREFERENCES };
