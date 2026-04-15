export type Styles = {
  'station-pulldown-icon': string;
  'station-select': string;
  'station-select-current-station': string;
  'station-select-station-details-description': string;
  'station-select-station-details-name': string;
  'station-select-station-now-playing-album': string;
  'station-select-station-now-playing-art': string;
  'station-select-station-now-playing-title': string;
};

export type ClassNames = keyof Styles;

declare const styles: Styles;

export default styles;
