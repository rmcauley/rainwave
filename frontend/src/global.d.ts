import type { RainwaveBootstrap } from './rainwaveApi/types';

declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

declare module '*.scss' {
  const stylesheet: string;
  export default stylesheet;
}

declare global {
  interface Window {
    bootstrap?: RainwaveBootstrap;
    rainwaveInit?: () => void;
  }
}

export {};
