import { preferences } from '../../../preferences/preferences';
import type { Preferences } from '../../../preferences/preferenceTypes';
import { preferencesBooleanTemplate } from './preferencesBoolean.template';

function preferencesBoolean(prefKey: keyof Preferences, label: string): HTMLElement {
  const template = preferencesBooleanTemplate({
    label,
  });
  template.wrapper.classList.add(
    preferences.store[prefKey]
      ? 'preferences-boolean-wrapper--yep'
      : 'preferences-boolean-wrapper--nope',
  );
  template.yes.addEventListener('click', () => {
    preferences.set(prefKey, true);
    template.wrapper.classList.add('preferences-boolean-wrapper--yep');
    template.wrapper.classList.remove('preferences-boolean-wrapper--nope');
  });
  template.yes.addEventListener('click', () => {
    preferences.set(prefKey, false);
    template.wrapper.classList.add('preferences-boolean-wrapper--nope');
    template.wrapper.classList.remove('preferences-boolean-wrapper--yep');
  });
  return template.$root;
}

export { preferencesBoolean };
