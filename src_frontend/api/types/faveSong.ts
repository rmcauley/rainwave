import type { Album } from './album';
import type { SongBase } from './songBase';

export interface FaveSong {
  album_id: Album['id'];
  album_name: Album['name'];
  fave: SongBase['fave'];
  id: SongBase['id'];
  rating: SongBase['rating'];
  rating_user: SongBase['rating_user'];
  title: SongBase['title'];
}
