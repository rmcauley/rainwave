import { $l } from '../language';
import { api } from '../rainwaveApi';
import type { components } from '../rainwaveApi/rainwave-openapi';

type Station = components['schemas']['_station_list_station'] & {
  name: string;
  url: string;
  color: string;
};

const stations: Station[] = [
  {
    color: '#a8cb2b', // greenish
    id: 5,
    name: $l('station_name_5'),
    url: '/all',
  },
  {
    color: '#1f95e5', // Rainwave blue
    id: 1,
    name: $l('station_name_1'),
    url: '/game',
  },
  {
    color: '#6e439d', // Indigo
    id: 4,
    name: $l('station_name_4'),
    url: '/chiptune',
  },
  {
    color: '#de641b', // OCR Orange
    id: 2,
    name: $l('station_name_2'),
    url: '/ocremix',
  },
  {
    color: '#b7000f', // Red
    id: 3,
    name: $l('station_name_3'),
    url: '/covers',
  },
  {
    color: '#186E75', // cool-ish?
    id: 6,
    name: $l('station_name_6'),
    url: '/chill',
  },
];

function correctCurrentUrlForStation(): void {
  if (window.location.pathname != '/') {
    return;
  }
  Object.values(stations).forEach((station) => {
    if (station.id === api.user.sid && window.location.pathname == '/') {
      window.history.replaceState(null, '', station.url);
    }
  });
}

export { correctCurrentUrlForStation, stations };
