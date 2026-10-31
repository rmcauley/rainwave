import { api } from '../../../rainwaveApi/api';
import { BaseFave } from '../baseFave/baseFave';

class SongFave extends BaseFave {
  static create(itemId: number, fave: boolean | null, faveHighlightElement: HTMLElement): SongFave {
    const el = document.createElement('song-fave');
    el.render(itemId, fave, faveHighlightElement);
    return el;
  }

  async doFaveApiCall(itemId: number, setTo: boolean): Promise<unknown> {
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
