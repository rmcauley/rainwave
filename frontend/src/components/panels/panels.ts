import { api } from '../../rainwaveApi/api';
import { updateFaveElements, updateFaveElementsAllSongs } from '../fave/updateFaveElements';
import type { Routes } from '../router/router';
import { panelsTemplate } from './panels.template';

class Panels {
  private currentRoute: keyof Routes | undefined;
  public template: ReturnType<typeof panelsTemplate>;

  constructor() {
    this.template = panelsTemplate();

    api.addEventListener('fave_album_result', (payload) =>
      updateFaveElements('album-fave', payload, this.template.$root),
    );
    api.addEventListener('fave_song_result', (payload) => {
      updateFaveElements('song-fave', payload, this.template.$root);
    });
    api.addEventListener('fave_all_songs_result', (payload) => {
      updateFaveElementsAllSongs(payload, this.template.$root);
    });
  }
}

export { Panels };
