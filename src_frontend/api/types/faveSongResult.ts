import type { BooleanResult } from './booleanResult';
import type { Station } from './station';

export interface FaveSongResult extends BooleanResult {
  /** ID of Song that changed. */
  id: number;
  fave: boolean;
  sid: Station;
}
