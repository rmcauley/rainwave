import type { Album } from './album';
import type { AlbumWithDetail } from './albumWithDetail';
import type { Artist } from './artist';
import type { ElecBlockedBy } from './elecBlockBy';
import type { SongBase } from './songBase';
import type { SongGroup } from './songGroup';
import type { Station } from './station';

export interface SongWithDetailArtist extends Artist {
  order: number;
}

export type SongWithDetailAlbum = Pick<
  Album,
  'id' | 'rating' | 'art' | 'name' | 'rating_user' | 'fave'
> & {
  rating_complete: AlbumWithDetail['rating_complete'];
};

export interface SongWithDetail extends SongBase {
  album: [SongWithDetailAlbum];
  artists: SongWithDetailArtist[];
  cool: boolean;
  elec_blocked_by: ElecBlockedBy;
  elec_blocked: boolean;
  groups: SongGroup[];
  /** When on All, this is the station that the song comes from. */
  origin_sid: Station;
  rating_allowed: boolean;
  rating_count: number;
  rating_rank_percentile: number;
  rating_rank: number;
  request_count: number;
  request_rank_percentile: number;
  request_rank: number;
  sid: Station;
}
