import type { Album, SongBase } from '.';
import type { RainwaveTime } from './time';

export interface PlaybackHistoryEntry {
  album_id: Album['id'];
  album_name: Album['name'];
  /** @deprecated */
  artist_parseable: string;
  fave: SongBase['fave'];
  id: SongBase['id'];
  rating: SongBase['rating'];
  rating_user: SongBase['rating_user'];
  song_played_at: RainwaveTime;
  title: SongBase['title'];
}

export type PlaybackHistory = PlaybackHistoryEntry[];
