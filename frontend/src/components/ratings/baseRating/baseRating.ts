import { formatRating } from '../../../helpers/formatRating';

import './baseRating.scss';

abstract class BaseRating extends HTMLElement {
  #ratingNumber: HTMLElement | undefined;

  static observedAttributes = ['user-rating', 'global-rating', 'hover-rating'];

  get hoverRating(): number {
    return Number(this.getAttribute('hover-rating') ?? 0);
  }
  set hoverRating(value: number | null) {
    this.setAttribute('hover-rating', String(value ?? 0));
  }

  get userRating(): number {
    return Number(this.getAttribute('user-rating') ?? 0);
  }
  set userRating(value: number | null) {
    this.setAttribute('user-rating', String(value ?? 0));
  }

  get globalRating(): number {
    return Number(this.getAttribute('global-rating') ?? 0);
  }
  set globalRating(value: number | null) {
    this.setAttribute('global-rating', String(value ?? 0));
  }

  render = (itemId: number, userRating: number | null, globalRating: number | null): void => {
    this.dataset.itemId = itemId.toString();
    this.classList.add('rating');
    this.#ratingNumber = document.createElement('div');
    this.#ratingNumber.classList.add('rating-number');
    this.appendChild(this.#ratingNumber);
    this.userRating = userRating;
    this.globalRating = globalRating;
  };

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void {
    if (this.hoverRating) {
      this.classList.add('rating--user');
      this.style.setProperty('--rating', this.hoverRating.toString());
      if (this.#ratingNumber) {
        this.#ratingNumber.textContent = formatRating(this.hoverRating);
      }
    } else if (this.userRating) {
      this.classList.add('rating--user');
      this.style.setProperty('--rating', this.userRating.toString());
      if (this.#ratingNumber) {
        this.#ratingNumber.textContent = formatRating(this.userRating);
      }
    } else {
      this.classList.remove('rating--user');
      this.style.setProperty('--rating', this.globalRating.toString());
      if (this.#ratingNumber) {
        this.#ratingNumber.textContent = '';
      }
    }
  }
}

export { BaseRating };
