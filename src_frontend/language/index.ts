import { cardinal, ordinal, ordinalSuffixes, translation } from './translations';

import type { RainwaveTranslationKey, RainwaveTranslationPlural } from './translations';

function formatOrdinal(value: number): string {
  const category = ordinal.select(value);
  const suffix = ordinalSuffixes[category] ?? ordinalSuffixes.other;

  return `${value}${suffix}`;
}

function formatPlural(plurals: RainwaveTranslationPlural['plurals'], value: number): string {
  const category = cardinal.select(value);
  const suffix = plurals[category] ?? plurals.other;

  return `${value}${suffix}`;
}

// Pass just "key" to receive a straight string back from the language file
// Pass "key" and "args" to receive a translated string with variables filled in
// Pass an element and the el will be filled with <span>s of each chunk of string
//    Variables will be given class "lang_[line]_[variablename]" when filling in variables
function $l(
  key: RainwaveTranslationKey,
  args?: Record<string, string | number>,
  el?: HTMLElement,
  clear_el?: boolean,
): string {
  if (el && clear_el) {
    el.replaceChildren();
  }

  const entry = translation[key];
  if (!entry) {
    // Unknown translation keys get a visible placeholder for debugging.
    return `[[${entry}]]`;
  }

  if (typeof entry === 'string') {
    return entry;
  }

  if (!args) {
    return '[[no args provided]]';
  }

  let text = '';
  entry.forEach((token) => {
    if (typeof token === 'string') {
      text += token;
    } else {
      let tokenText: string;

      const value = args[token.key];
      if (token.type === 'ordinal' && typeof value === 'number') {
        tokenText = formatOrdinal(value);
      } else if (token.type === 'plural' && typeof value === 'number') {
        tokenText = formatPlural(token.plurals, value);
      } else if (token.type === 'substitute' && value !== undefined) {
        tokenText = typeof value === 'number' ? value.toString() : value;
      } else {
        tokenText = `[[${token.key}]]`;
      }

      text += tokenText;

      if (el) {
        const piece = document.createElement('span');
        piece.textContent = tokenText;
        piece.className = 'lang_' + key + '_' + token.key;
        el.appendChild(piece);
      }
    }
  });

  return text;
}

window.$l = $l;

export { $l };
