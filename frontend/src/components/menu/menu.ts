import { HamburgerMenu } from './hamburgerMenu/hamburgerMenu';
import { initPlayer } from './player/player';
import { StationSelect } from './stationSelect/stationSelect';

import './menu.css';

const menuRequestsLabel = document.getElementById('requests-link-text')!;

function initMenu(): void {
  initPlayer();

  // These are side effect classes, as the HTML they applies to are already on index.html
  // oxlint-disable-next-line no-new
  new StationSelect();
  // oxlint-disable-next-line no-new
  new HamburgerMenu();
}

export { initMenu, menuRequestsLabel };
