import { svgIcon } from '../../../helpers/svg';
import { api } from '../../../rainwaveApi/api';
import { showErrorTooltip } from '../../errorTooltip/errorTooltip';

import './baseFave.scss';

abstract class BaseFave extends HTMLElement {
  static observedAttributes = ['fave'];
  get fave(): boolean {
    return this.getAttribute('fave') === 'true';
  }
  set fave(value: boolean) {
    this.setAttribute('fave', value ? 'true' : 'false');
  }

  appendToParent(parent: HTMLElement, itemId: number, fave: boolean): void {
    this.dataset.itemId = itemId.toString();
    this.classList.add('fave');
    this.appendChild(svgIcon('#rw-fave-empty'));
    this.appendChild(svgIcon('#rw-fave-fill'));

    if (api.user.id > 1) {
      this.addEventListener('click', this.onFaveClick);
    }

    parent.appendChild(this);
    this.fave = fave;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'fave') {
      if (value === 'true') {
        this.classList.add('fave--faved');
        if (this.parentNode instanceof HTMLElement) {
          this.parentNode.classList.add('fave-highlight');
        }
      } else {
        this.classList.remove('fave--faved');
        if (this.parentNode instanceof HTMLElement) {
          this.parentNode.classList.remove('fave-highlight');
        }
      }
    }
  }

  abstract doFaveApiCall(itemId: number, setTo: boolean): Promise<unknown>;

  onFaveClick = (): void => {
    const itemId = Number(this.dataset.itemId);
    if (!itemId || Number.isNaN(itemId)) {
      return;
    }
    this.classList.add('fave--clicked');
    this.doFaveApiCall(itemId, !this.fave)
      .catch((err) => showErrorTooltip(err, this))
      .finally(() => this.classList.remove('fave--clicked'));
  };
}

export { BaseFave };
