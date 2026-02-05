import { DEFAULT_PREFERENCES } from './default-preferences';
import { legacyPreferences } from './load-legacy-preferences';

import type { PreferenceChange, Preferences } from './preferences-types';

const LOCAL_STORAGE_KEY = 'rw_prefs';

const preferenceEvents = new EventTarget();

const preferences: Preferences = { ...DEFAULT_PREFERENCES, ...legacyPreferences };

try {
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw) {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'object') {
      Object.assign(preferences, parsed);
    }
  }
} catch (e) {
  // Allow console logging this for debugging.
  // eslint-disable-next-line no-console
  console.error('Preferences could not be loaded from storage.  Preferences reset.', e);
  // Don't throw though, we don't want these gunking up our reports.
}

function savePreferences(): void {
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(preferences));
}

function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
  const previous = preferences[key];
  preferences[key] = value;
  savePreferences();
  preferenceEvents.dispatchEvent(
    new CustomEvent<PreferenceChange<K>>('change', {
      detail: {
        key,
        value,
        previous,
      },
    }),
  );
}

export { preferences, preferenceEvents, setPreference };
