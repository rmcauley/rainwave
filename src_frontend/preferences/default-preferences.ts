import type { Preferences } from './preferences-types';

const DEFAULT_PREFERENCES: Preferences = {
  volume: 1,
  powerUserMode: false,
  useRobotoFont: true,
  shrinkFontWithScreenWidth: false,
  enableNotifications: false,
  indicateIncompleteAlbums: false,
  hideGlobalRatings: false,
  showDeleteRatingButton: false,
  showRatingInTitle: false,
  showClockInTitle: true,
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
