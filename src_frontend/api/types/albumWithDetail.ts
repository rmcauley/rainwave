import type { Album } from './album';
import type { SongBase } from './songBase';
import type { SongGroup } from './songGroup';
import type { Station } from './station';
import type { RainwaveTime } from './time';

export interface SongOnAlbum extends SongBase {
  /** When on All, this is the station that the song comes from. */
  origin_sid: Station;
  added_on: RainwaveTime;
  /** @internal */
  cool_multiply?: number;
  /** @internal */
  cool_override?: number | null;
  requestable: boolean;
  cool: boolean;
  cool_end: RainwaveTime;
  /** @internal */
  request_only_end: RainwaveTime;
  /** @internal */
  request_only: boolean;
}

export interface AlbumWithDetail extends Album {
  genres: SongGroup[];
  rating_complete: boolean | null;
  rating_rank: number;
  rating_rank_percentile: number;
  request_count: number;
  request_rank: number;
  request_rank_percentile: number;
  rating_histogram: Record<string, number>;
  songs: SongOnAlbum[];
}
