export type Styles = {
  desktop: string;
  link: string;
  obvious: string;
  rainwave: string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
