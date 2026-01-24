import type { RainwaveTime } from './time';

export interface RequestLineEntry {
  username: string;
  user_id: number;
  /** @internal */
  line_expiry_tune_in: RainwaveTime | null;
  /** @internal */
  line_expiry_election: RainwaveTime | null;
  /** @internal */
  line_wait_start: RainwaveTime;
  /** @internal */
  line_has_had_valid: boolean;
  song_id: number | null;
  skip: boolean;
  position: number;
}

export type RequestLine = RequestLineEntry[];
