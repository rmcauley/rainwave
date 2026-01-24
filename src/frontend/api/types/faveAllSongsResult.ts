import type { BooleanResult } from './booleanResult';
import type { Station } from './station';

export interface FaveAllSongsResult extends BooleanResult {
  /** IDs of songs that were updated. */
  song_ids: number[];
  fave: boolean;
  sid: Station;
}
