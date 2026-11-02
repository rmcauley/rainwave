import { $l } from '../../language';
import { preferencesLayout } from './preferencesLayout';

function preferencesModal(): { $root: HTMLElement | DocumentFragment } {
  const frag = document.createDocumentFragment();

  preferencesLayout.forEach(({ header, prefsList }) => {
    const section = document.createElement('div');
    frag.appendChild(section);
    if (header) {
      const headerEl = document.createElement('div');
      headerEl.className = 'preferences-modal-section-header';
      headerEl.textContent = header;
      section.appendChild(headerEl);
    }
    prefsList.forEach(({ component, prefKey, tlKey }) => {
      section.appendChild(component(prefKey, $l(tlKey)));
    });
  });
  return {
    $root: frag,
  };
}
export { preferencesModal };
