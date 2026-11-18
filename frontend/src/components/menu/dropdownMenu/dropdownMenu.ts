import './dropdownMenu.scss';

abstract class DropdownMenu {
  el: HTMLElement;

  private opened: boolean;

  constructor(el: HTMLElement) {
    this.el = el;
    this.opened = false;
  }

  close = (_evt: Event): void => {
    if (this.el.classList.contains('dropdown-menu--open')) {
      this.el.classList.remove('dropdown-menu--open');

      document.body.removeEventListener('touchstart', this.close);
    }
  };

  open = (_evt: Event): void => {
    if (!this.opened) {
      this.onFirstOpen();
      this.opened = true;
    }
    if (!this.el.classList.contains('dropdown-menu--open')) {
      this.el.classList.add('dropdown-menu--open');

      document.body.addEventListener('touchstart', this.close);
    }
  };

  toggle = (evt: Event): void => {
    if (this.el.classList.contains('dropdown-menu--open')) {
      this.close(evt);
    } else {
      this.open(evt);
    }
  };

  abstract onFirstOpen(): void;
}

export { DropdownMenu };
