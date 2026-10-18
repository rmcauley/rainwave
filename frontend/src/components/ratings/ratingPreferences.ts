import { preferences } from '../../preferences/preferences';

function onShowDeleteRatingButtonChange(): void {
  if (preferences.store.showDeleteRatingButton) {
    document.body.classList.add('rating-show-delete-button');
  } else {
    document.body.classList.remove('rating-show-delete-button');
  }
}

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
  onShowDeleteRatingButtonChange();

  preferences.addEventListener('hideGlobalRatings', onHideGlobalRatingsChange);
  preferences.addEventListener('indicateIncompleteAlbums', onIndicateIncompleteAlbumsChange);
  preferences.addEventListener('showDeleteRatingButton', onShowDeleteRatingButtonChange);
}

export { initRatingPreferences };
