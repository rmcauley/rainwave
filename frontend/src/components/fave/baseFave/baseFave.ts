import { svgIcon } from '../../../helpers/svg';
import { api } from '../../../rainwaveApi/api';
import { showErrorTooltip } from '../../errorTooltip/errorTooltip';

// import './baseFave.scss';

type FaveableObject = { fave: boolean | null };

abstract class BaseFave extends HTMLElement {
  private faveHighlightElement: HTMLElement | undefined;
  private itemObject: FaveableObject | undefined;

  static observedAttributes = ['fave'];

  get fave(): boolean {
    return this.getAttribute('fave') === 'true';
  }
  set fave(value: boolean) {
    this.setAttribute('fave', value ? 'true' : 'false');
  }

  render(itemId: number, itemObject: FaveableObject, faveHighlightElement: HTMLElement): void {
    this.dataset.itemId = itemId.toString();
    this.classList.add('fave');
    this.appendChild(svgIcon('#rw-fave-empty'));
    this.appendChild(svgIcon('#rw-fave-fill'));

    if (api.user.id > 1) {
      this.addEventListener('click', this.onFaveClick);
    }

    this.faveHighlightElement = faveHighlightElement;
    this.itemObject = itemObject;

    this.fave = itemObject.fave || false;
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'fave') {
      if (value === 'true') {
        if (this.itemObject) {
          this.itemObject.fave = true;
        }
        this.classList.add('fave--faved');
        if (this.faveHighlightElement) {
          this.faveHighlightElement.classList.add('fave-highlight');
        }
      } else {
        if (this.itemObject) {
          this.itemObject.fave = false;
        }
        this.classList.remove('fave--faved');
        if (this.faveHighlightElement) {
          this.faveHighlightElement.classList.remove('fave-highlight');
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
      .catch((err: unknown) => {
        showErrorTooltip(err, this);
      })
      .finally(() => {
        this.classList.remove('fave--clicked');
      });
  };
}

export { BaseFave };
export type { FaveableObject };
