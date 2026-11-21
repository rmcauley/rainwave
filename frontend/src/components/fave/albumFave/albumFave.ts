import { api } from '../../../rainwaveApi/api';
import type { FaveableObject } from '../baseFave/baseFave';
import { BaseFave } from '../baseFave/baseFave';

class AlbumFave extends BaseFave {
  static create(
    itemId: number,
    album: FaveableObject,
    faveHighlightElement: HTMLElement,
  ): AlbumFave {
    const el = document.createElement('album-fave');
    el.render(itemId, album, faveHighlightElement);
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
