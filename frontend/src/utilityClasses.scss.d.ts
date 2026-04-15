export type Styles = {
  'power-only': string;
  'scrollable': string;
  'simple': string;
  'touchable': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
