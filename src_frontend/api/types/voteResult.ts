import type { RainwaveEvent, RainwaveEventSong } from '.';
import type { BooleanResult } from './booleanResult';

export interface VoteResult extends BooleanResult {
  elec_id: RainwaveEvent['id'];
  entry_id: RainwaveEventSong['entry_id'];
}
