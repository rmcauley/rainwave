import type { Album, SongBase } from '.';

export interface AllSongsSong {
  album_name: Album['name'];
  fave: Album['fave'];
  id: Album['id'];
  rating: Album['rating'];
  rating_user: Album['rating_user'];
  title: SongBase['title'];
}
