import type { Preferences } from '../../../preferences/preferenceTypes';

function preferencesMultiOption(_prefKey: keyof Preferences): HTMLElement {
  return document.createElement('div');
}

export { preferencesMultiOption };
