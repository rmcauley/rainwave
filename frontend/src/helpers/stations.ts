import { $l } from '../language';
import type { components } from '../rainwaveApi/rainwave-openapi';

type Station = components['schemas']['_station_list_station'] & {
  name: string;
  url: string;
  color: string;
};

const stations = new Map<number, Station>();
stations.set(5, {
  color: '#a8cb2b', // greenish
  id: 5,
  name: $l('station_name_5'),
  url: '/all',
});
stations.set(1, {
  color: '#1f95e5', // Rainwave blue
  id: 1,
  name: $l('station_name_1'),
  url: '/game',
});
stations.set(2, {
  color: '#6e439d', // Indigo
  id: 4,
  name: $l('station_name_4'),
  url: '/chiptune',
});
stations.set(3, {
  color: '#de641b', // OCR Orange
  id: 2,
  name: $l('station_name_2'),
  url: '/ocremix',
});
stations.set(4, {
  color: '#b7000f', // Red
  id: 3,
  name: $l('station_name_3'),
  url: '/covers',
});
stations.set(6, {
  color: '#186E75', // cool-ish?
  id: 6,
  name: $l('station_name_6'),
  url: '/chill',
});

const stationOrder = Array.from(stations.keys());

export type { Station };
export { stations, stationOrder };
