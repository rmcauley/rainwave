class RequestsIndicator {
  element: HTMLElement;

  #number: number;
  #hideTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'requests-indicator';
    this.#number = 0;
  }

  private hide = (): void => {
    this.element.classList.remove('requests-indicator--show');
    this.#hideTimeout = undefined;
    this.#number = 0;
  };

  increment = (increment: number): void => {
    this.#number += increment;
    this.element.textContent = this.#number === 0 ? '=' : this.#number.toString();
    this.element.classList.add('requests-indicator--show');
    if (this.#hideTimeout) {
      clearTimeout(this.#hideTimeout);
    }
    this.#hideTimeout = setTimeout(this.hide, 2000);
  };
}

const requestIndicator = new RequestsIndicator();

export { requestIndicator };
