import { RainwaveEventListener } from '../rainwaveApi/eventListener';

type Routes = {
  album: ['album', number | undefined];
  artist: ['artist', number | undefined];
  group: ['group', number | undefined];
  listener: ['listener', number | undefined];
  request_line: ['request_line', number | undefined];
  search: ['search', number | undefined];
};

const routeKeys: Set<keyof Routes> = new Set([
  'album',
  'artist',
  'group',
  'listener',
  'request_line',
  'search',
]);

class RouterClass extends RainwaveEventListener<Routes> {
  currentRoute: keyof Routes | undefined;
  currentId: number | undefined;

  constructor() {
    super();

    window.addEventListener('hashchange', this.detectUrlChange);
  }

  private detectUrlChange = (): void => {
    const deepLink = decodeURI(location.hash);
    if (deepLink.startsWith('#!/')) {
      const [route, id] = deepLink.split('/');
      if (route && routeKeys.has(route as keyof Routes)) {
        this.currentRoute = route as keyof Routes;
        if (id && !Number.isNaN(Number(id))) {
          this.currentId = Number(id);
          this.emit(route as keyof Routes, [route as keyof Routes, Number(id)]);
        } else {
          this.currentId = undefined;
          this.emit(route as keyof Routes, [route as keyof Routes, undefined]);
        }
      }
    }
  };
}

const router = new RouterClass();

export type { Routes };
export { router };
