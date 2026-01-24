import type { Relays } from './relays';
import type { Station } from './station';

export interface StationDescription {
  description: string;
  id: Station;
  name: string;
  relays: Relays;
  stream: string;
}

export type Stations = StationDescription[];
