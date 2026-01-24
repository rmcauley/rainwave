import type { Album } from './album';
import type { AlbumWithDetail } from './albumWithDetail';
import type { Artist } from './artist';
import type { SongBase } from './songBase';
import type { Station } from './station';
import type { RainwaveTime } from './time';

export interface SearchAlbum {
  id: Album['id'];
  name: Album['name'];
  cool: boolean;
  rating: Album['rating'];
  fave: Album['fave'];
  rating_user: Album['rating_user'];
  rating_complete: AlbumWithDetail['rating_complete'];
}

export interface SearchArtist {
  id: Artist['id'];
  name: Artist['name'];
}

export interface SearchSong extends Omit<SongBase, 'albums' | 'artists'> {
  added_on: RainwaveTime;
  album_id: Album['id'];
  album_name: Album['name'];
  cool_end: RainwaveTime;
  cool: boolean;
  /** When on All, this is the station that the song comes from. */
  origin_sid: Station;
  requestable: boolean;
}

export interface SearchResult {
  albums: SearchAlbum[];
  artists: SearchArtist[];
  songs: SearchSong[];
}
