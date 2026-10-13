import { initMenu } from './components/menu/menu';
import { Panels } from './components/panels/panels';
import { Playlist } from './components/playlist/playlist';

import './index.scss';
import './utilityClasses.scss';
import { preferences } from './preferences/preferences';
import { api } from './rainwaveApi/api';

function rainwaveInit(): void {
  api.setOptions({
    apiKey: window.BOOTSTRAP.user.api_key,
    sid: window.BOOTSTRAP.user.sid,
    userId: window.BOOTSTRAP.user.id,
  });
  api.processPayload({ api_info: window.BOOTSTRAP.api_info });
  api.processPayload({ user: window.BOOTSTRAP.user });

  initMenu();
  // api.addEventListener('error', showTooltipError)
  // api.addEventListener('wserror', showTooltipError)
  // api.addEventListener('sdk_exception', showTooltipError)
  // api.addEventListener('sdk_error_clear', showTooltipError)
  // api.addEventListener('wsthrottle')

  // API.on('wserror', function (json) {
  //   if (json.tl_key === 'auth_failed') {
  //     const template = Modal($l('auth_required'), 'modal_auth_failure', {}, true);
  //     if (!template) {return;}
  //     template._root.parentNode.classList.add('error');
  //   }
  // });

  // RWAudio = RWAudioConstructor();

  if (preferences.store.powerUserMode) {
    document.body.classList.add('power');
  } else {
    document.body.classList.add('simple');
  }

  const playlist = new Playlist();
  document.getElementById('main')!.appendChild(playlist.template.$root);

  const panels = new Panels();
  document.getElementById('main')!.appendChild(panels.template.$root);

  // correctCurrentUrlForStation();

  api.processPayload(window.BOOTSTRAP);
}

if (window.BOOTSTRAP) {
  rainwaveInit();
} else {
  window.rainwaveInit = rainwaveInit;
}
