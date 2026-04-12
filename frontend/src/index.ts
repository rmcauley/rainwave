import { preferences } from './preferences';

import './index.scss';
import './components/menu/menu.scss';
import './components/menu/stationSelect/stationSelect.scss';

function rainwaveInit(): void {
  // api.addEventListener('error', showTooltipError)
  // TODO
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
}

if (!window.bootstrap) {
  window.rainwaveInit = rainwaveInit;
}
