import { $l } from '../language';

import type { Notifier } from './notifierType';

const windowsFirefoxNotifier: Notifier = (song, artists, art) => {
  return new Notification($l('now_playing'), {
    body: `${song.title}\n${song.albums[0].name}\n${artists}`,
    tag: 'current_song',
    icon: art,
  });
};

export { windowsFirefoxNotifier };
