import type { components } from '../../rainwaveApi/rainwave-openapi';
import type { AlbumRating } from './albumRating/albumRating';
import type { SongRating } from './songRating/songRating';

function updateRatingElements(
  payload: components['schemas']['rate_result'],
  rootElement: HTMLElement,
): void {
  // Errors are handled in the individual rating functions, not globally here.
  if (!payload.success) {
    return;
  }

  const songRatings = rootElement.querySelectorAll<SongRating>(
    `song-rating[data-item-id="${payload.song_id}"]`,
  );
  songRatings.forEach((songRating) => {
    songRating.userRating = payload.rating_user;
  });

  payload.updated_album_ratings.forEach((albumPayload) => {
    const albumRatings = rootElement.querySelectorAll<AlbumRating>(
      `album-rating[data-item-id="${albumPayload.id}"]`,
    );
    albumRatings.forEach((albumRating) => {
      albumRating.userRating = albumPayload.rating_user;
      albumRating.ratingComplete = albumPayload.rating_complete;
    });
  });
}

export { updateRatingElements };
