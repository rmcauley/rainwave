type Listener<T> = (data: T) => void;

export class RainwaveEventListener<E> {
  private _eventListeners: { [K in keyof E]?: Listener<E[K]>[] } = {} as {
    [K in keyof E]?: Listener<E[K]>[];
  };

  constructor() {
    this._eventListeners = {};
  }

  /**
   * Add a callback to handle a Rainwave API event.
   *
   * @category Event Handling
   */
  public addEventListener<K extends keyof E>(event: K, fn: Listener<E[K]>): void {
    const eListeners = this._eventListeners[event];
    if (eListeners) {
      eListeners.push(fn);
    } else {
      this._eventListeners[event] = [fn];
    }
  }

  /**
   * Remove a callback from the Rainwave API event handling.
   *
   * @category Event Handling
   */
  public removeEventListener<K extends keyof E>(event: K, fn: Listener<E[K]>): void {
    const eListeners = this._eventListeners[event];
    if (eListeners) {
      this._eventListeners[event] = eListeners.filter((listener) => listener !== fn);
    }
  }

  protected emit<K extends keyof E>(event: K, data: E[K]): void {
    const eListeners = this._eventListeners[event];
    if (eListeners) {
      eListeners.forEach((listener) => listener(data));
    }
  }
}
