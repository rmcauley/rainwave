import { preferences } from '../../../preferences/preferences';
import type { components } from '../../../rainwaveApi/rainwave-openapi';

function panelSongsSort(
  songA: components['schemas']['album']['songs'][number],
  songB: components['schemas']['album']['songs'][number],
): number {
  const { playlistUnratedFirst, playlistFavesFirst, playlistAvailableFirst, playlistSort } =
    preferences.store;

  if (playlistUnratedFirst) {
    if (songA.rating_user && !songB.rating_user) {
      return 1;
    } else if (!songA.rating_user && songB.rating_user) {
      return -1;
    }
  }

  if (playlistFavesFirst) {
    if (songA.fave && !songB.fave) {
      return -1;
    } else if (!songA.fave && songB.fave) {
      return 1;
    }
  }

  if (playlistAvailableFirst) {
    if (songA.cool && !songB.cool) {
      return 1;
    } else if (!songA.cool && songB.cool) {
      return 1;
    }
  }

  if (playlistSort === 'rating') {
    const aRating = songA.rating_user ?? songA.rating;
    const bRating = songB.rating_user ?? songB.rating;
    if (aRating > bRating) {
      return -1;
    } else if (aRating < bRating) {
      return 1;
    }
  }

  if (songA.title.toLowerCase() > songB.title.toLowerCase()) {
    return 1;
  } else if (songA.title.toLowerCase() < songB.title.toLowerCase()) {
    return -1;
  }

  return 0;
}

export { panelSongsSort };
