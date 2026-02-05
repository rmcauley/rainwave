import type { Album, SongBase } from '.';

export interface UnratedSong {
  album_name: Album['name'];
  id: SongBase['id'];
  title: SongBase['title'];
}

export type UnratedSongs = UnratedSong[];
