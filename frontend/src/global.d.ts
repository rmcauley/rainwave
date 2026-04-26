import type { RainwaveBootstrap } from './rainwaveApi/types';

declare global {
  interface Window {
    BOOTSTRAP: RainwaveBootstrap;
    rainwaveInit?: () => void;
  }
}

export {};
