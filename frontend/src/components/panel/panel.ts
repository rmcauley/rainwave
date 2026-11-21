abstract class Panel {
  el: HTMLElement;

  constructor(id: string) {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error(`Could not find panel ${id}`);
    }
    this.el = el;
    this.el.classList.add('panel');
  }

  open = (): void => {
    this.el.classList.add('panel--open');
  };

  close = (): void => {
    this.el.classList.remove('panel--open');
  };

  toggle = (): void => {
    if (this.el.classList.contains('panel--open')) {
      this.close();
    } else {
      this.open();
    }
  };
}

export { Panel };
