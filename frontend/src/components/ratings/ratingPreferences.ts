import { preferences } from '../../preferences/preferences';

function onIndicateIncompleteAlbumsChange(): void {
  if (preferences.store.indicateIncompleteAlbums) {
    document.body.classList.add('rating-show-incomplete-albums');
  } else {
    document.body.classList.remove('rating-show-incomplete-albums');
  }
}

function onHideGlobalRatingsChange(): void {
  if (preferences.store.hideGlobalRatings) {
    document.body.classList.add('rating-hide-global');
  } else {
    document.body.classList.remove('rating-hide-global');
  }
}

function initRatingPreferences(): void {
  onHideGlobalRatingsChange();
  onIndicateIncompleteAlbumsChange();

  preferences.addEventListener('hideGlobalRatings', onHideGlobalRatingsChange);
  preferences.addEventListener('indicateIncompleteAlbums', onIndicateIncompleteAlbumsChange);
}

export { initRatingPreferences };
