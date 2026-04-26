import { initMenu } from './components/menu/menu';
import { preferences } from './preferences';
import { api } from './rainwaveApi';

import './index.scss';
import './utilityClasses.scss';

function rainwaveInit(): void {
  api.setOptions({
    apiKey: window.BOOTSTRAP.user.api_key,
    sid: window.BOOTSTRAP.user.sid,
    userId: window.BOOTSTRAP.user.id,
  });
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

  if (preferences.powerUserMode) {
    document.body.classList.add('power');
  } else {
    document.body.classList.add('simple');
  }

  // correctCurrentUrlForStation();

  api.processPayload(window.BOOTSTRAP);
}

if (window.BOOTSTRAP) {
  rainwaveInit();
} else {
  window.rainwaveInit = rainwaveInit;
}
