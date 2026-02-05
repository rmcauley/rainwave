/**
 * Null if the user has not rated this yet, or a number between 1.0 and 5.0 if the user has rated it.
 */
export type RatingUser = number | null;
/**
 * Rating value that the user can give this Song between 1.0 and 5.0.  You can convert a number to this type with {@link getValidatedRatingUser}.
 */
export type ValidatedSongRatingUser = 1.0 | 1.5 | 2.0 | 2.5 | 3.0 | 3.5 | 4.0 | 4.5 | 5.0;
