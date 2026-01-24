import type { SongGroup } from './songGroup';

export interface GroupInList {
  id: SongGroup['id'];
  name: SongGroup['name'];
}

export interface AllGroupsPaginated {
  data: GroupInList[];
  /**
   * If true, there is still more data to load.
   */
  has_next: boolean;
  /**
   * Pass this number as `after` argument to `all_groups_paginated`.
   */
  next: number;
  /**
   * Number from `0` to `100` indicating loading percent.
   */
  progress: number;
}
