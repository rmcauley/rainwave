import type { Preferences } from '../../../preferences/preferenceTypes';

function preferencesBoolean(_prefKey: keyof Preferences): HTMLElement {
  return document.createElement('div');
}

export { preferencesBoolean };
