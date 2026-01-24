import type { Album, SongBase } from '.';
import type { Station } from './station';

export interface Top100Song {
  album_name: Album['name'];
  id: SongBase['id'];
  /** When on All, this is the station that the song comes from. */
  origin_sid: Station;
  song_rating: SongBase['rating'];
  song_rating_count: number;
  title: SongBase['title'];
}

export type Top100 = Top100Song[];
