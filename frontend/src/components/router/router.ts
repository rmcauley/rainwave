import { RainwaveEventListener } from '../../rainwaveApi/eventListener';

type Routes = {
  album: ['album', number | undefined];
  artist: ['artist', number | undefined];
  group: ['group', number | undefined];
  listener: ['listener', number | undefined];
  request_line: ['request_line', number | undefined];
  search: ['search', number | undefined];
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
      if (param && !Number.isNaN(param)) {
        this.emit(route as keyof Routes, [route as keyof Routes, Number(param)]);
      } else {
        this.emit(route as keyof Routes, [route as keyof Routes, undefined]);
      }
    }
  };
}

const router = new RouterClass();

export type { Routes };
export { router };
