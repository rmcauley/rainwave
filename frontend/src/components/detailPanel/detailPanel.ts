import { api } from '../../rainwaveApi/api';
import type { RainwaveParams, RainwaveResponse } from '../../rainwaveApi/types';
import { router } from '../../router/router';
import { updateFaveElements, updateFaveElementsAllSongs } from '../fave/updateFaveElements';
import { Panel } from '../panel/panel';
import { albumDetail } from './albumDetail/albumDetail';
import { artistDetail } from './artistDetail/artistDetail';
import { groupDetail } from './groupDetail/groupDetail';
import { listenerDetail } from './listenerDetail/listenerDetail';

type DetailRoute = 'album' | 'artist' | 'group' | 'listener';

const detailRenderers: {
  [K in DetailRoute]: (payload: RainwaveResponse<K>) => Node;
} = {
  album: (payload) => albumDetail(payload.album),
  artist: (payload) => artistDetail(payload.artist),
  group: (payload) => groupDetail(payload.group),
  listener: (payload) => listenerDetail(payload.listener),
};

class DetailPanel extends Panel {
  private currentlyOpenRoute: DetailRoute | undefined;
  private currentlyOpenId: number | undefined;

  constructor() {
    super('detail-panel');

    api.addEventListener('fave_album_result', (payload) => {
      updateFaveElements('album-fave', payload, this.el);
    });
    api.addEventListener('fave_song_result', (payload) => {
      updateFaveElements('song-fave', payload, this.el);
    });
    api.addEventListener('fave_all_songs_result', (payload) => {
      updateFaveElementsAllSongs(payload, this.el);
    });
    api.addEventListener('sdk_schedule_synced', () => {
      if (this.currentlyOpenRoute && this.currentlyOpenId) {
        this.onRouteChange([this.currentlyOpenRoute, this.currentlyOpenId]);
      }
    });

    router.addEventListener('album', this.onRouteChange);
    router.addEventListener('artist', this.onRouteChange);
    router.addEventListener('group', this.onRouteChange);
    router.addEventListener('listener', this.onRouteChange);
  }

  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters
  onRouteChange = <T extends DetailRoute>([route, id]: [T, number | undefined]): void => {
    this.open();
    // TODO: Review this behaviour - we need to unmount when hidden in simple mode, but stay
    // rendered in power user mode unless the tab is switched (maybe?)
    // Do we empty children on panel close in simple mode, or on open?
    if (!id) {
      return;
    }

    this.currentlyOpenRoute = route;
    this.currentlyOpenId = id;

    api
      .fetch(route, { id } as RainwaveParams<T>)
      .then((payload: RainwaveResponse<T>) => {
        if (this.currentlyOpenRoute !== route || this.currentlyOpenId !== id) {
          return;
        }
        this.currentlyOpenRoute = route;
        this.currentlyOpenId = id;
        this.el.replaceChildren(detailRenderers[route](payload));
      })
      .catch(this.onError);
  };

  onError = (_err: unknown): void => {
    // TODO: this
  };
}

export { DetailPanel };
