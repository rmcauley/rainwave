import type { Preferences } from '../../../preferences/preferenceTypes';

function preferencesLanguage(_prefKey: keyof Preferences): HTMLElement {
  return document.createElement('div');
}

export { preferencesLanguage };
