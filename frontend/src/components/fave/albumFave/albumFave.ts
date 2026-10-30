import { api } from '../../../rainwaveApi/api';
import { BaseFave } from '../baseFave/baseFave';

class AlbumFave extends BaseFave {
  static appendToParent(parent: HTMLElement, itemId: number, fave: boolean): AlbumFave {
    const el = document.createElement('album-fave');
    el.appendToParent(parent, itemId, fave);
    return el;
  }

  async doFaveApiCall(itemId: number, setTo: boolean): Promise<unknown> {
    return api.fetch('fave_album', { fave: setTo, album_id: itemId });
  }
}

customElements.define('album-fave', AlbumFave);

declare global {
  interface HTMLElementTagNameMap {
    'album-fave': AlbumFave;
  }
}

export { AlbumFave };
