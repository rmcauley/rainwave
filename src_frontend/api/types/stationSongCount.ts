import type { Station } from './station';

export interface StationSongCountByStation {
  sid: Station;
  song_count: number;
}

export type StationSongCount = StationSongCountByStation[];
