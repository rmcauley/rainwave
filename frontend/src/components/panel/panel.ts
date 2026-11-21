abstract class Panel {
  el: HTMLDivElement;

  constructor(id: string) {
    this.el = document.createElement('div');
    this.el.id = id;
    this.el.className = 'panel';
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
