import type { RatableObject } from '../baseRating/baseRating';
import { BaseRating } from '../baseRating/baseRating';

type AlbumRatableObject = RatableObject & { rating_complete: boolean };

class AlbumRating extends BaseRating {
  declare ratingObject: AlbumRatableObject | undefined;
  static observedAttributes = [...BaseRating.observedAttributes, 'rating-complete'];

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

  static create(itemId: number, ratingObject: AlbumRatableObject): AlbumRating {
    const element = document.createElement('album-rating');
    element.render(itemId, ratingObject);
    element.ratingComplete = ratingObject.rating_complete;
    return element;
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void {
    if (this.ratingObject) {
      this.ratingObject.rating_complete = this.ratingComplete;
    }
    this.ratingAttributeChangedCallback();
  }
}

customElements.define('album-rating', AlbumRating);

declare global {
  interface HTMLElementTagNameMap {
    'album-rating': AlbumRating;
  }
}

export { AlbumRating };
