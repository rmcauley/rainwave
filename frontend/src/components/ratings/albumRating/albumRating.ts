import { BaseRating } from '../baseRating/baseRating';

class AlbumRating extends BaseRating {
  get ratingComplete(): boolean {
    return this.getAttribute('rating-complete') === 'true';
  }
  set ratingComplete(value: boolean) {
    this.setAttribute('rating-complete', value ? 'true' : 'false');

    if (value) {
      this.classList.add('rating--complete');
    } else {
      this.classList.remove('rating--complete');
    }
  }
}

export { AlbumRating };
