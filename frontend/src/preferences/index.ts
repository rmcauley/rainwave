import { RainwaveEventListener } from '../rainwaveApi/eventListener';
import { DEFAULT_PREFERENCES } from './defaultPreferences';
import { legacyPreferences } from './loadLegacyPreferences';
import type { Preferences } from './preferenceTypes';

const LOCAL_STORAGE_KEY = 'rw_prefs';

class PreferencesClass extends RainwaveEventListener<Preferences> {
  store: Preferences;

  constructor() {
    super();
    this.store = {
      ...DEFAULT_PREFERENCES,
      ...legacyPreferences,
    };

    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (typeof parsed === 'object') {
          Object.assign(this.store, parsed);
        }
      }
    } catch (e) {
      // oxlint-disable-next-line no-console
      console.warn('Preferences could not be loaded from storage.  Preferences reset.', e);
      // Don't throw though, we don't want these gunking up our reports.
    }
  }

  save = (): void => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this.store));
  };

  set = <K extends keyof Preferences>(key: K, value: Preferences[K]): void => {
    this.store[key] = value;
    if (this.store.playlistUnratedFirst && !this.store.indicateIncompleteAlbums) {
      this.store.indicateIncompleteAlbums = true;
    }
    this.save();
    this.emit(key, value);
  };
}

const preferences = new PreferencesClass();

export { preferences };
