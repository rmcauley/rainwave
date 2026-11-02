import type { RainwaveLocale } from '../../../language/translations';
import { ALL_TRANSLATIONS } from '../../../language/translations';
import { preferences } from '../../../preferences/preferences';
import type { Preferences } from '../../../preferences/preferenceTypes';
import { preferencesMultiOptionTemplate } from './preferencesMultiOption.template';

const PREFERENCE_VALUES = {
  locale: Array.from(Object.keys(ALL_TRANSLATIONS)),
  permanentlyVisiblePreviousElections: ['0', '1', '2', '3', '4', '5'],
};

function preferencesMultiOption(prefKey: keyof Preferences, label: string): HTMLElement {
  if (prefKey !== 'locale' && prefKey !== 'permanentlyVisiblePreviousElections') {
    throw new Error(`preferencesMultiOption: ${prefKey} not in PREFERENCE_VALUES`);
  }
  const template = preferencesMultiOptionTemplate({
    label,
    values: PREFERENCE_VALUES[prefKey],
  });

  if (prefKey === 'permanentlyVisiblePreviousElections') {
    template.values.forEach(({ button }, index) => {
      button.addEventListener('click', () => {
        preferences.set(prefKey, index);
      });
    });
  } else {
    template.values.forEach(({ button }) => {
      button.addEventListener('click', () => {
        preferences.set(prefKey, button.dataset.value as RainwaveLocale);
      });
    });
  }

  return template.$root;
}

export { preferencesMultiOption };
