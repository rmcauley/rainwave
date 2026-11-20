import { api } from '../../../rainwaveApi/api';
import { DropdownMenu } from '../dropdownMenu/dropdownMenu';
import { hamburgerMenuTemplate } from './hamburgerMenu.template';

class HamburgerMenu extends DropdownMenu {
  constructor() {
    super(document.getElementById('hamburger-menu-mouse-area')!);
  }

  onFirstOpen = (): void => {
    const template = hamburgerMenuTemplate({ user: api.user });
    document.getElementById('hamburger-menu')!.appendChild(template.$root);
  };
}

export { HamburgerMenu };
