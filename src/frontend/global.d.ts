import type { RainwaveBootstrap } from './api/responseTypes';
import type { RainwaveTranslationKey } from './language/translations';

declare global {
  const bootstrap: RainwaveBootstrap;

  interface Window {
    $l: (
      key: RainwaveTranslationKey,
      args?: Record<string, string | number>,
      el?: HTMLElement,
      clear_el?: boolean,
    ) => string;
  }
}

export {};
