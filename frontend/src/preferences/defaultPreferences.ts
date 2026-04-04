import type { Preferences } from './preferenceTypes';

const DEFAULT_PREFERENCES: Preferences = {
  volume: 1,
  powerUserMode: false,
  useRobotoFont: true,
  shrinkFontWithScreenWidth: false,
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
  hotkeyLayout: 'QWER',
  showPreviousElections: false,
  showHowManyPreviousElections: 5,
  showSongsThatLostElection: false,
};

export { DEFAULT_PREFERENCES };
