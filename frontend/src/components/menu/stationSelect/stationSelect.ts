import { stations } from '../../../helpers/stations';
import { $l } from '../../../language';
import { api } from '../../../rainwaveApi';

import { stationSelect } from './stationSelect.template';

import type { RainwaveTranslationKey } from '../../../language/translations';

import './stationSelect.scss';

const stationSelectMenu = document.getElementById('station-select-menu')!;

function closeStationSelect(_evt: Event): void {
  if (stationSelectMenu.classList.contains('open')) {
    stationSelectMenu.classList.remove('open');

    document.body.removeEventListener('touchstart', closeStationSelect);
  }
}

function openStationSelect(_evt: Event): void {
  if (!stationSelectMenu.classList.contains('open')) {
    stationSelectMenu.classList.add('open');

    document.body.addEventListener('touchstart', closeStationSelect);
  }
}

function toggleStationSelect(evt: Event): void {
  if (stationSelectMenu.classList.contains('open')) {
    closeStationSelect(evt);
  } else {
    openStationSelect(evt);
  }
}

function initStationSelect(): void {
  document.getElementById('station-select-header')!.addEventListener('click', toggleStationSelect);

  const stationLinks: Record<number, ReturnType<typeof stationSelect>> = {};
  stations.forEach((station): void => {
    if (station.id !== api.user.sid) {
      const stationLink = stationSelect({
        description: $l(`station_menu_description_id_${station.id}` as RainwaveTranslationKey),
        name: station.name,
        url: station.url,
      });
      stationLinks[station.id] = stationLink;
      document.getElementById('station-select-menu')!.appendChild(stationLink.$root);
    }
  });

  api.addEventListener('all_stations_info', (data) => {
    Object.entries(stationLinks).forEach(([stationId, stationLink]) => {
      const stationData = data[stationId];
      if (stationData) {
        stationLink.menuNpArt.style.backgroundImage = stationData.art || '';
        stationLink.menuNpAlbum.textContent = stationData.album;
        stationLink.menuNpSong.textContent = stationData.title;
      }
    });
  });
}

export { initStationSelect };
