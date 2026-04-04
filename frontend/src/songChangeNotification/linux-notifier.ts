import type { Notifier } from './notifier-type';

const linuxNotifier: Notifier = (song, artists, _art) => {
  return new Notification(song.title, {
    body: song.albums[0].name + '\n' + artists,
    tag: 'current_song',
  });
};

export { linuxNotifier };
