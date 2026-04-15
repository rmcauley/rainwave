export type Styles = {
  'header': string;
  'menu': string;
  'menu-right': string;
  'menu-right-item': string;
  'menu-right-text': string;
  'open': string;
  'paused': string;
  'power': string;
  'requests-link': string;
  'warning': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
