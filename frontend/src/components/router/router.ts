import { RainwaveEventListener } from '../../rainwaveApi/eventListener';
import { albumList } from '../playlist/albumList/albumList';
import { artistList } from '../playlist/artistList/artistList';
import { groupList } from '../playlist/groupList/groupList';
import { requestLineList } from '../playlist/requestLineList/requestLineList';

type Routes = {
  album: number | undefined;
  artist: number | undefined;
  group: number | undefined;
  listener: number;
  request_line: undefined;
  search: undefined;
};

const routeToList: Record<
  keyof Routes,
  typeof albumList | typeof artistList | typeof groupList | typeof requestLineList | undefined
> = {
  album: albumList,
  artist: artistList,
  group: groupList,
  request_line: requestLineList,
  listener: undefined,
  search: undefined,
};

class RouterClass extends RainwaveEventListener<Routes> {
  constructor() {
    super();

    window.addEventListener('hashchange', this.#detectUrlChange);
  }

  #detectUrlChange = (): void => {
    const deepLink = decodeURI(location.hash);
    if (deepLink.startsWith('#!/')) {
      const [route, param] = deepLink.split('/');
      if (route && route in routeToList) {
        // TODO: set open tab
        const list = routeToList[route as keyof Routes];
        const itemId = param ? Number(param) : undefined;
        if (list && itemId && !Number.isNaN(itemId)) {
          list.setOpenItem(itemId);
          // TODO: open detail
        }
        this.emit(route as keyof Routes, itemId);
      }
    }
  };
}

const router = new RouterClass();

export type { Routes };
export { router };
