import { formatRating } from '../../../helpers/formatRating';

import './baseRating.scss';

abstract class BaseRating extends HTMLElement {
  static observedAttributes = ['user-rating', 'global-rating'];
  get userRating(): number {
    return Number(this.getAttribute('user-rating') ?? 0);
  }
  set userRating(value: number | null) {
    this.setAttribute('user-rating', String(value || 0));
  }

  get globalRating(): number {
    return Number(this.getAttribute('global-rating') ?? 0);
  }
  set globalRating(value: number | null) {
    this.setAttribute('global-rating', String(value || 0));
  }

  attributeChangedCallback(_name: string, _old: string | null, _value: string | null): void {
    if (this.userRating) {
      this.classList.add('rating--user');
      this.style.setProperty('--rating', this.userRating.toString());
      if (this.lastChild) {
        this.lastChild.textContent = formatRating(this.userRating);
      }
    } else {
      this.classList.remove('rating--user');
      this.style.setProperty('--rating', this.globalRating.toString());
      if (this.lastChild) {
        this.lastChild.textContent = '';
      }
    }
  }
}

export { BaseRating };
