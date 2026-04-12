import type { RainwaveBootstrap } from './rainwaveApi/types';

declare global {
  interface Window {
    bootstrap?: RainwaveBootstrap;
    rainwaveInit?: () => void;
  }
}

export {};
