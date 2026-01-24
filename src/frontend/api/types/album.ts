import type { RatingUser } from '.';
import type { RainwaveTime } from './time';

export interface Album {
  added_on: RainwaveTime;
  /**
   * Base album art URL for Rainwave.
   *
   * Usage:
   *
   * ```typescript
   * const artLowRes = `https://rainwave.cc/${albumArt}_120.jpg`;
   * const artMedRes = `https://rainwave.cc/${albumArt}_240.jpg`;
   * const artMaxRes = `https://rainwave.cc/${albumArt}_320.jpg`;
   * if (!albumArt) {
   *   const backupArt = "https://rainwave.cc/static/images4/noart_1.jpg";
   * }
   * ```
   */
  art: string | null;
  cool_lowest: RainwaveTime;
  /** @internal */
  cool_multiply?: number;
  /** @internal */
  cool_override?: number | null;
  cool: boolean;
  fave_count: number;
  fave: boolean | null;
  id: number;
  name: string;
  played_last: RainwaveTime;
  rating_count: number;
  rating_user: RatingUser;
  rating: number | null;
  request_count: number;
  song_count: number;
  vote_count: number;
}
