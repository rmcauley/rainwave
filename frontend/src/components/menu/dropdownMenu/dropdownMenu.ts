abstract class DropdownMenu {
  el: HTMLElement;
  className: string;

  private opened: boolean;

  constructor(el: HTMLElement) {
    this.el = el;
    this.className = el.className;
    this.opened = false;
  }

  close = (_evt: Event): void => {
    if (this.el.classList.contains(`${this.className}--open`)) {
      this.el.classList.remove(`${this.className}--open`);

      document.body.removeEventListener('touchstart', this.close);
    }
  };

  open = (_evt: Event): void => {
    if (!this.opened) {
      this.onFirstOpen();
      this.opened = true;
    }
    if (!this.el.classList.contains(`${this.className}--open`)) {
      this.el.classList.add(`${this.className}--open`);

      document.body.addEventListener('touchstart', this.close);
    }
  };

  toggle = (evt: Event): void => {
    if (this.el.classList.contains(`${this.className}--open`)) {
      this.close(evt);
    } else {
      this.open(evt);
    }
  };

  abstract onFirstOpen(): void;
}

export { DropdownMenu };
