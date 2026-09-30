import { getAlbumArt } from '../../../helpers/albumArt';
import type { Station } from '../../../helpers/stations';
import { stations } from '../../../helpers/stations';
import { $l } from '../../../language';
import type { RainwaveTranslationKey } from '../../../language/translations';
import { api } from '../../../rainwaveApi';

import './stationSelect.scss';
import { stationSelect } from './stationSelect.template';

const stationSelectMenu = document.getElementById('station-select-mouse-area')!;

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

function renderStationLink(station: Station): ReturnType<typeof stationSelect> {
  const stationLink = stationSelect({
    description: $l(`station_menu_description_id_${station.id}` as RainwaveTranslationKey),
    name: station.name,
    url: station.url,
  });
  stationLink.anchor.classList.add(`station-select-station-${station.id}`);
  document.getElementById('station-select-menu')!.appendChild(stationLink.$root);
  return stationLink;
}

function initStationSelect(): void {
  document.getElementById('station-select-header')!.addEventListener('click', toggleStationSelect);
  document.getElementById('station-select-menu-header')!.textContent = $l(
    'station_select_all_header',
  );

  const stationLinks: Record<number, ReturnType<typeof stationSelect>> = {};
  stations.forEach((station): void => {
    if (station.id !== 6) {
      stationLinks[station.id] = renderStationLink(station);
    }
  });

  const separateStationHeader = document.createElement('div');
  separateStationHeader.id = 'station-select-menu-separate-header';
  separateStationHeader.textContent = $l('station_select_separate_header');
  document.getElementById('station-select-menu')!.appendChild(separateStationHeader);
  stationLinks[6] = renderStationLink(stations.find((s) => s.id === 6)!);

  api.addEventListener('all_stations_info', (data) => {
    Object.entries(stationLinks).forEach(([stationId, stationLink]) => {
      const stationData = data[stationId];
      if (stationData) {
        stationLink.menuNpArt.style.backgroundImage = `url("${getAlbumArt(stationData.art)}")`;
        stationLink.menuNpAlbum.textContent = stationData.album;
        stationLink.menuNpSong.textContent = stationData.title;
      }
    });
  });
}

export { initStationSelect };
