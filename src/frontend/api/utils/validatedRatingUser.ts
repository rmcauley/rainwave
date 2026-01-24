import { RainwaveSDKInvalidRatingError } from '../errors';

import type { RatingUser, ValidatedSongRatingUser } from '../types/ratingUser';

function guardRatingUser(ratingUser: RatingUser): ValidatedSongRatingUser {
  if (ratingUser === 1) {
    return 1;
  } else if (ratingUser === 1.5) {
    return 1.5;
  } else if (ratingUser === 2) {
    return 2;
  } else if (ratingUser === 2.5) {
    return 2.5;
  } else if (ratingUser === 3) {
    return 3;
  } else if (ratingUser === 3.5) {
    return 3.5;
  } else if (ratingUser === 4) {
    return 4;
  } else if (ratingUser === 4.5) {
    return 4.5;
  } else if (ratingUser === 5) {
    return 5;
  }
  throw new RainwaveSDKInvalidRatingError(`${String(ratingUser)}`);
}

/**
 * Takes a number and returns a type-guarded {@link ValidatedRatingUser}.
 *
 * Numbers below 1 are changed to 1.  Numbers above 5 are changed to 5.  Numbers in-between are rounded to their closest value in {@link ValidatedRatingUser}.
 *
 * @param ratingUser Any number to be clamped to a valid Rainwave rating between 1 and 5.
 */
export function getValidatedRatingUser(ratingUser: number): ValidatedSongRatingUser {
  const clamped = Math.min(5, Math.max(1, ratingUser));
  const rounded = Math.round((clamped * 10) / 5) / 2;

  return guardRatingUser(rounded);
}
