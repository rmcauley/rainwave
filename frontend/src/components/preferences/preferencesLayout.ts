import type { RainwaveTranslationKey } from '../../language/translations';
import type { Preferences } from '../../preferences/preferenceTypes';
import { preferencesBoolean } from './preferencesBoolean/preferencesBoolean';
import { preferencesLanguage } from './preferencesLanguage/preferencesLanguage';
import { preferencesMultiOption } from './preferencesMultiOption/preferencesMultiOption';

type PreferenceLayoutEntry = {
  tlKey: RainwaveTranslationKey;
  prefKey: keyof Preferences | 'language';
  component: (prefKey: keyof Preferences) => HTMLElement;
};

type PreferenceSection = {
  header?: RainwaveTranslationKey;
  preferences: Array<PreferenceLayoutEntry>;
};

const preferencesLayout: Array<PreferenceSection> = [
  {
    preferences: [
      {
        tlKey: 'change_language',
        prefKey: 'language',
        component: preferencesLanguage,
      },
      {
        tlKey: 'prefs_notify',
        prefKey: 'enableNotifications',
        component: preferencesBoolean,
      },
    ],
  },
  {
    header: 'site_mode',
    preferences: [
      {
        tlKey: 'prefs_pwr',
        prefKey: 'powerUserMode',
        component: preferencesBoolean,
      },
    ],
  },
  {
    header: 'tab_title_preferences',
    preferences: [
      {
        tlKey: 'prefs_t_tl',
        prefKey: 'showSongInTitle',
        component: preferencesBoolean,
      },
      {
        tlKey: 'prefs_t_clk',
        prefKey: 'showClockInTitle',
        component: preferencesBoolean,
      },
    ],
  },
  {
    header: 'timeline_preferences',
    preferences: [
      {
        tlKey: 'prefs_l_displose',
        prefKey: 'showSongsThatLostElection',
        component: preferencesBoolean,
      },
      {
        tlKey: 'prefs_l_stksz',
        prefKey: 'showHowManyPreviousElections',
        component: preferencesMultiOption,
      },
    ],
  },
  {
    header: 'playlist_preferences',
    preferences: [
      {
        tlKey: 'prefs_p_sort',
        prefKey: 'playlistSort',
        component: preferencesBoolean,
      },
      {
        tlKey: 'prefs_p_favup',
        prefKey: 'playlistFavesFirst',
        component: preferencesBoolean,
      },
      {
        tlKey: 'prefs_p_avup',
        prefKey: 'playlistAvailableFirst',
        component: preferencesBoolean,
      },
      {
        tlKey: 'prefs_p_null1',
        prefKey: 'playlistUnratedFirst',
        component: preferencesBoolean,
      },
      {
        tlKey: 'prefs_p_songsort',
        prefKey: 'playlistSortSongsLikeAlbums',
        component: preferencesBoolean,
      },
    ],
  },
  {
    header: 'rating_preferences',
    preferences: [
      {
        tlKey: 'prefs_r_incmplt',
        prefKey: 'indicateIncompleteAlbums',
        component: preferencesBoolean,
      },
      {
        tlKey: 'prefs_r_noglbl',
        prefKey: 'hideGlobalRatings',
        component: preferencesBoolean,
      },
      {
        tlKey: 'prefs_r_clear',
        prefKey: 'showDeleteRatingButton',
        component: preferencesBoolean,
      },
    ],
  },
];

export { preferencesLayout };
