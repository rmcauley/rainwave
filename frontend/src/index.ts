import { initMenu } from './components/menu/menu';
import { showModal } from './components/modal/modal';
import { initRatingPreferences } from './components/ratings/ratingPreferences';
import { onErrorHandler } from './helpers/errorHandler';
import { syncClock } from './helpers/serverTime';
import { stations } from './helpers/stations';
import { updateSiteMode } from './helpers/viewportSizeAndLayout';
import { api } from './rainwaveApi/api';

import './index.css';

window.addEventListener('error', onErrorHandler);

function rainwaveInit(): void {
  api.setOptions({
    apiKey: window.BOOTSTRAP.user.api_key,
    sid: window.BOOTSTRAP.user.sid,
    userId: window.BOOTSTRAP.user.id,
  });
  api.processPayload({ api_info: window.BOOTSTRAP.api_info });
  api.processPayload({ user: window.BOOTSTRAP.user });

  updateSiteMode();

  syncClock(window.BOOTSTRAP.api_info);

  initMenu();
  initRatingPreferences();

  api.addEventListener('wserror', function (payload) {
    if (payload.tl_key === 'auth_failed') {
      showModal('authFailure');
    }
  });

  if (window.location.pathname === '/') {
    const station = stations.get(api.user.sid);
    if (station) {
      window.history.replaceState(null, '', station.url);
    }
  }

  api.processPayload(window.BOOTSTRAP);
}

if (window.BOOTSTRAP) {
  rainwaveInit();
} else {
  window.rainwaveInit = rainwaveInit;
}
