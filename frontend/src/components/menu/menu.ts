import { HamburgerMenu } from './hamburgerMenu/hamburgerMenu';
import { initPlayer } from './player/player';

import './menu.scss';
import { StationSelect } from './stationSelect/stationSelect';

const menuRequestsLabel = document.getElementById('requests-link-text')!;

function initMenu(): void {
  // if (template.settings_link) {
  //   template.settings_link.addEventListener('click', SettingsWindow);
  // }
  // template.playlist_link.addEventListener('click', function () {
  //   if (document.body.classList.contains('playlist')) {
  //     Router.change();
  //   } else {
  //     Router.openLast();
  //   }
  // });
  // template.burger_button.addEventListener('click', function () {
  //   template.hamburger_container.classList.toggle('burger-open');
  // });
  // const closeBurger = function () {
  //   template.hamburger_container.classList.remove('burger-open');
  // };
  // template.menu_wrapper.addEventListener('mouseleave', closeBurger);
  // template.request_link.addEventListener('click', closeBurger);
  // template.playlist_link.addEventListener('click', closeBurger);
  // template.player.addEventListener('click', closeBurger);
  // if (template.user_link) {
  //   template.user_link.addEventListener('click', closeBurger);
  // }
  initPlayer();

  const stationSelect = new StationSelect();
  stationSelect.init();

  const hamburgerMenu = new HamburgerMenu();
  hamburgerMenu.init();
}

export { initMenu, menuRequestsLabel };
