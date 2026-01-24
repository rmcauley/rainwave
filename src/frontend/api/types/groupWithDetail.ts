import type { Album } from '.';
import type { SongBase } from './songBase';
import type { Station } from './station';
import type { RainwaveTime } from './time';

export interface GroupSong extends Omit<SongBase, 'artists'> {
  cool_end: RainwaveTime;
  cool: boolean;
  requestable: boolean;
}

export interface GroupWithDetail {
  id: number;
  name: string;
  all_songs_for_sid: Record<Album['id'], Record<Station, GroupSong>>;
}
