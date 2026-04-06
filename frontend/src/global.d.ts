import type { RainwaveBootstrap } from './rainwaveApi/types';

declare module '*.scss';

declare global {
  interface Window {
    bootstrap?: RainwaveBootstrap;
    rainwaveInit?: () => void;
  }
}

export {};
