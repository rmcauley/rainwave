import { api } from '../../../rainwaveApi/api';
import { BaseFave } from '../baseFave/baseFave';

class SongFave extends BaseFave {
  static appendToParent(parent: HTMLElement, itemId: number, fave: boolean): SongFave {
    const el = document.createElement('song-fave');
    el.appendToParent(parent, itemId, fave);
    return el;
  }

  doFaveApiCall(itemId: number, setTo: boolean): Promise<unknown> {
    return api.fetch('fave_song', { fave: setTo, song_id: itemId });
  }
}

customElements.define('song-fave', SongFave);

declare global {
  interface HTMLElementTagNameMap {
    'song-fave': SongFave;
  }
}

export { SongFave };
