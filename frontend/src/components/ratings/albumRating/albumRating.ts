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

  static create(itemId: number): AlbumRating {
    const element = document.createElement('album-rating');
    element.render(itemId);
    return element;
  }
}

customElements.define('album-rating', AlbumRating);

declare global {
  interface HTMLElementTagNameMap {
    'album-rating': AlbumRating;
  }
}

export { AlbumRating };
