import type { RainwavePagedParams } from './rainwavePagedParams';

export interface AllSongsRequestParams extends RainwavePagedParams {
  /**
   * How songs in the album will be sorted.
   * - `undefined | null`: alphabetically.
   * - `rating`: rating, descending.
   * */
  order?: 'rating';
}
