import type { Notifier } from './notifierType';

const standardNotifier: Notifier = (song, artists, art) => {
  return new Notification(song.title, {
    body: `${song.albums[0].name}\n${artists}`,
    tag: 'current_song',
    icon: art,
  });
};

export { standardNotifier };
