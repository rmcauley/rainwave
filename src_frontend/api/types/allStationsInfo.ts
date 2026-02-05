import type { Album, SongBase } from '.';
import type { RainwaveEvent } from './rainwaveEvent';
import type { Station } from './station';

export interface StationInfo {
  title: SongBase['title'];
  album: Album['name'];
  art: Album['art'];
  artists: string;
  event_name: RainwaveEvent['name'];
  event_type: RainwaveEvent['type'];
}

export type AllStationsInfo = Record<Station, StationInfo>;
