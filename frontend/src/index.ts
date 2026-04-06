import { showTooltipError } from "./components/errorTooltip/errorTooltip";
import { api } from "./rainwaveApi";

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

  RWAudio = RWAudioConstructor();

  Prefs.define('pwr');
  if (Prefs.get('pwr')) {
    Sizing.simple = false;
  }

  Prefs.define('roboto', [true, false]);
  Prefs.define('f_norm', [true, false], true);
  Prefs.add_callback('roboto', function (nv) {
    if (!nv) {
      document.body.classList.add('nofont');
    } else {
      document.body.classList.remove('nofont');
    }
  });
  Prefs.add_callback('f_norm', function (nv) {
    if (!nv) {
      document.body.classList.add('nofontsize');
    } else {
      document.body.classList.remove('nofontsize');
    }
  });

  const order = [5, 1, 4, 2, 3, 6];
  const colors = {
    1: '#1f95e5', // Rainwave blue
    2: '#de641b', // OCR Orange
    3: '#b7000f', // Red
    4: '#6e439d', // Indigo
    5: '#a8cb2b', // greenish
    6: '#186E75', // cool-ish?
  };
  for (var i = 0; i < order.length; i++) {
    if (BOOTSTRAP.station_list[order[i]]) {
      Stations.push(BOOTSTRAP.station_list[order[i]]);
      Stations[Stations.length - 1].name = $l(`station_name_${  order[i]}`);
      const stationUrl = new URL(Stations[Stations.length - 1].url);
      if (order[i] == BOOTSTRAP.user.sid) {
        if (window.location.pathname == '/' && window.location.hostname == stationUrl.hostname) {
          window.history.replaceState(null, '', stationUrl.pathname + window.location.search);
        }
        Stations[Stations.length - 1].url = null;
      }
      if (colors[order[i]]) {
        Stations[Stations.length - 1].color = colors[order[i]];
      }
    }
  }

  if (window.location.href.indexOf('beta') !== -1) {
    for (i = 0; i < Stations.length; i++) {
      if (Stations[i].url) {Stations[i].url = `/beta/?sid=${  Stations[i].id}`;}
    }
  }
  BOOTSTRAP.station_list = Stations;

  template = RWTemplates.index({ stations: Stations });


  if (Prefs.get('pwr')) {
    document.body.classList.add('full');
    document.body.classList.remove('simple');
  }
  if (!Prefs.get('f_norm')) {
    document.body.classList.add('nofontsize');
  }
  if (Prefs.get('l_displose')) {
    document.body.classList.add('displose');
  }


  // if (!Router.detectUrlChange()) {
  //   if (!Sizing.simple && docCookies.getItem('r5_list')) {
  //     Router.change(docCookies.getItem('r5_list'));
  //   } else if (Sizing.simple) {
  //     docCookies.removeItem('r5_list', '/', BOOTSTRAP.cookie_domain);
  //   }
  // }
}

export {};
