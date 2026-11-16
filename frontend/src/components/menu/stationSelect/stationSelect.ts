import { getAlbumArt } from '../../../helpers/albumArt';
import type { Station } from '../../../helpers/stations';
import { stations } from '../../../helpers/stations';
import { $l } from '../../../language';
import type { RainwaveTranslationKey } from '../../../language/translations';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { DropdownMenu } from '../dropdownMenu/dropdownMenu';

import './stationSelect.scss';
import { stationSelectTemplate } from './stationSelect.template';

function renderStationLink(station: Station): ReturnType<typeof stationSelectTemplate> {
  const stationLink = stationSelectTemplate({
    description: $l(`station_menu_description_id_${station.id}` as RainwaveTranslationKey),
    name: station.name,
    url: station.url,
  });
  stationLink.anchor.classList.add(`station-select-station-${station.id}`);
  document.getElementById('station-select-menu')!.appendChild(stationLink.$root);
  return stationLink;
}

class StationSelect extends DropdownMenu {
  allStationsData: components['schemas']['all_stations_info'];
  stationLinks: Record<number, ReturnType<typeof stationSelectTemplate>>;

  constructor() {
    super(document.getElementById('station-select-mouse-area')!);

    document.getElementById('station-select-header')!.addEventListener('click', this.toggle);
    document.getElementById('station-select-menu-header')!.textContent = $l(
      'station_select_all_header',
    );

    this.stationLinks = {};
    this.allStationsData = {};
  }

  init = (): void => {
    api.addEventListener('all_stations_info', this.onUpdate);
  };

  onUpdate = (data: components['schemas']['all_stations_info']): void => {
    this.allStationsData = data;
    Object.entries(this.stationLinks).forEach(([stationId, stationLink]) => {
      const stationData = data[stationId];
      if (stationData) {
        stationLink.menuNpArt.style.backgroundImage = `url("${getAlbumArt(stationData.art)}")`;
        stationLink.menuNpAlbum.textContent = stationData.album;
        stationLink.menuNpSong.textContent = stationData.title;
      }
    });
  };

  onFirstOpen = (): void => {
    stations.forEach((station): void => {
      if (station.id !== 6) {
        this.stationLinks[station.id] = renderStationLink(station);
      }
    });

    const separateStationHeader = document.createElement('div');
    separateStationHeader.id = 'station-select-menu-separate-header';
    separateStationHeader.textContent = $l('station_select_separate_header');
    document.getElementById('station-select-menu')!.appendChild(separateStationHeader);
    this.stationLinks[6] = renderStationLink(stations.get(6)!);

    this.onUpdate(this.allStationsData);
  };
}

export { StationSelect };
