import type { BooleanResult } from './booleanResult';
import type { Station } from './station';

export interface FaveAlbumResult extends BooleanResult {
  /** ID of the changed album. */
  id: number;
  /** New fave status. */
  fave: boolean;
  sid: Station;
}
