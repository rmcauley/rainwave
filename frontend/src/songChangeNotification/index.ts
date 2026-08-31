import { getAlbumArt } from '../helpers/albumArt';
import { isProbablyMobileBrowser } from '../helpers/isProbablyMobile';
import { preferences } from '../preferences';
import { api } from '../rainwaveApi';
import type { TimelineEntry } from '../rainwaveApi/types';
import { linuxNotifier } from './linuxNotifier';
import type { Notifier } from './notifierType';
import { standardNotifier } from './standardNotifier';
import { windowsFirefoxNotifier } from './windowsFirefoxNotifier';

let enabled = false;
const currentSongId: number | undefined | null = null;
let notifier: Notifier = standardNotifier;

function checkPermission(): void {
  if (!preferences.enableNotifications) {
    return;
  }
  if (enabled) {
    return;
  }

  Notification.requestPermission()
    .then((status) => {
      if (status === 'granted') {
        enabled = true;
      } else {
        enabled = false;
      }
    })
    .catch(() => (enabled = false));
}

function notify(schedCurrent: TimelineEntry): void {
  if (!enabled || !preferences.enableNotifications) {
    return;
  }
  const currentSong = schedCurrent.songs[0];
  if (!currentSong || currentSong.id == currentSongId) {
    return;
  }
  if (!api.user.tuned_in) {
    return;
  }

  const art = getAlbumArt(currentSong);
  const artists = currentSong.artists.map((a) => a.name).join(', ');
  try {
    const n = notifier(currentSong, artists, art);
    n.addEventListener('show', function (): void {
      setTimeout(n.close.bind(n), 7000);
    });
  } catch (e) {
    enabled = false;
    console.error(e);
  }
}

function registerSongChangeNotification(): void {
  if (isProbablyMobileBrowser()) {
    return;
  }

  if (preferences.enableNotifications) {
    checkPermission();
  }

  api.addEventListener('sched_current', notify);

  const ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf('linux') >= 0) {
    notifier = linuxNotifier;
  } else if (ua.indexOf('windows') >= 0 && ua.indexOf('gecko') >= 0) {
    notifier = windowsFirefoxNotifier;
  } else {
    notifier = standardNotifier;
  }
}

export { registerSongChangeNotification };
