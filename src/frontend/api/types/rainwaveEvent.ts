import type { Album } from './album';
import type { Artist } from './artist';
import type { ElecBlockedBy } from './elecBlockBy';
import type { ElectionSongType } from './electionSongType';
import type { SongBase } from './songBase';
import type { SongGroup } from './songGroup';
import type { Station } from './station';
import type { RainwaveTime } from './time';

export interface RainwaveEventSongArtist extends Artist {
  order: number;
}

export interface RainwaveEventSong extends SongBase {
  albums: [Pick<Album, 'id' | 'rating' | 'art' | 'name' | 'rating_user' | 'fave'>];
  artists: RainwaveEventSongArtist[];
  cool: boolean;
  elec_blocked_by: ElecBlockedBy;
  elec_blocked: boolean;
  elec_request_user_id: number | null;
  elec_request_username: string | null;
  entry_id: number;
  entry_position: number;
  entry_type: ElectionSongType;
  entry_votes: number;
  groups: SongGroup[];
  /** When on All, this is the station that the song comes from. */
  origin_sid: Station;
  rating_allowed: boolean;
  rating_count: number;
  request_id?: number | null;
  request_count: number;
  sid: Station;
}

export interface RainwaveEvent {
  id: number;
  start: RainwaveTime;
  start_actual: RainwaveTime | null;
  end: RainwaveTime;
  type: 'Election' | 'OneUp' | 'PVPElection';
  name: string | null;
  sid: Station;
  url: string | null;
  voting_allowed: boolean;
  used: boolean;
  length: number;
  /** @internal */
  core_event_id: number | null;
  songs: RainwaveEventSong[];
}
