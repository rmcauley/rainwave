import type { Album } from './album';
import type { AlbumWithDetail } from './albumWithDetail';
import type { RainwaveTime } from './time';

export interface AlbumInList {
  id: Album['id'];
  name: Album['name'];
  rating: Album['rating'];
  cool: boolean;
  cool_lowest: RainwaveTime;
  fave: Album['fave'];
  rating_user: Album['rating_user'];
  rating_complete: AlbumWithDetail['rating_complete'];
  newest_song_time: RainwaveTime;
}

export interface AllAlbumsPaginated {
  data: AlbumInList[];
  /**
   * If true, there is still more data to load.
   */
  has_next: boolean;
  /**
   * Pass this number as `after` argument to `all_albums_paginated`.
   */
  next: number;
  /**
   * Number from `0` to `100` indicating loading percent.
   */
  progress: number;
}
