import type { Artist } from './artist';

export interface ArtistInList {
  id: Artist['id'];
  name: Artist['name'];
  song_count: number;
}

export interface AllArtistsPaginated {
  data: ArtistInList[];
  /**
   * If true, there is still more data to load.
   */
  has_next: boolean;
  /**
   * Pass this number as `after` argument to `all_artists_paginated`.
   */
  next: number;
  /**
   * Number from `0` to `100` indicating loading percent.
   */
  progress: number;
}
