import { initMenu } from './components/menu/menu';
import { showModal } from './components/modal/modal';
import { Panels } from './components/panels/panels';
import { Playlist } from './components/playlist/playlist';
import { initRatingPreferences } from './components/ratings/ratingPreferences';
import { syncClock } from './helpers/clock';
import { onErrorHandler } from './helpers/errorHandler';
import { stations } from './helpers/stations';
import { preferences } from './preferences/preferences';
import { api } from './rainwaveApi/api';

import './index.scss';
import './utilityClasses.scss';

window.addEventListener('error', onErrorHandler);

function rainwaveInit(): void {
  api.setOptions({
    apiKey: window.BOOTSTRAP.user.api_key,
    sid: window.BOOTSTRAP.user.sid,
    userId: window.BOOTSTRAP.user.id,
  });
  api.processPayload({ api_info: window.BOOTSTRAP.api_info });
  api.processPayload({ user: window.BOOTSTRAP.user });

  syncClock(window.BOOTSTRAP.api_info);

  initMenu();
  initRatingPreferences();

  api.addEventListener('wserror', function (payload) {
    if (payload.tl_key === 'auth_failed') {
      showModal('authFailure');
    }
  });

  if (preferences.store.powerUserMode) {
    document.body.classList.add('power');
  } else {
    document.body.classList.add('simple');
  }

  const playlist = new Playlist();
  document.getElementById('main')!.appendChild(playlist.template.$root);

  const panels = new Panels();
  document.getElementById('main')!.appendChild(panels.template.$root);

  if (window.location.pathname === '/') {
    stations.forEach((station) => {
      if (station.id === api.user.sid) {
        window.history.replaceState(null, '', station.url);
      }
    });
  }

  api.processPayload(window.BOOTSTRAP);
}

if (window.BOOTSTRAP) {
  rainwaveInit();
} else {
  window.rainwaveInit = rainwaveInit;
}
