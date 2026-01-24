import type { Artist } from './artist';
import type { SongBase } from './songBase';
import type { Station } from './station';

export interface SongInArtist extends Omit<SongBase, 'artists'> {
  cool: boolean;
  requestable: boolean;
  sid: Station;
}

export interface ArtistWithSongs extends Artist {
  all_songs: Record<Station, Record<number, SongInArtist[]>>;
}
