import type { RainwaveBootstrap } from './rainwaveApi/types';

declare global {
  interface Window {
    BOOTSTRAP: RainwaveBootstrap;
    rainwaveInit?: () => void;
  }
}

// oxlint-disable-next-line unicorn/require-module-specifiers
export {};
