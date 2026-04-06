import { isProbablyMobileBrowser } from '../../helpers/isProbablyMobile';

type RainwavePlayerEventName =
  | 'playing'
  | 'stop'
  | 'change'
  | 'volumeChange'
  | 'loading'
  | 'stall'
  | 'error';

const SUPPORTED_EVENTS = new Set<RainwavePlayerEventName>([
  'playing',
  'stop',
  'change',
  'volumeChange',
  'loading',
  'stall',
  'error',
]);

class RainwaveAudioBackend extends EventTarget {
  debug = false;
  type: 'mp3' | 'ogg' = 'mp3';
  audioElDest: HTMLElement | false = false;
  isPlaying = false;
  volume = 1.0;
  isMuted = false;
  mimetype = 'audio/mp3';

  private readonly stallDelay = 2000;
  private audioEl: HTMLAudioElement;
  private stallTimeout: ReturnType<typeof setTimeout> | null = null;
  private stallActive = false;
  private streamURL: string = 'https://relay.rainwave.cc/all.mp3';
  private isResettingAudio = false;

  constructor(parentElement: HTMLElement = document.body) {
    super();
    this.audioEl = this.createAudioElement(parentElement);
    this.detectSupport();
  }

  playToggle = async (): Promise<void> => {
    if (this.isPlaying) {
      this.stop();
    } else {
      await this.play();
    }
  };

  play = async (): Promise<void> => {
    if (this.isPlaying) {
      return;
    }

    this.stopAudioConnectError();

    if (this.audioEl.src !== this.streamURL) {
      this.audioEl.src = this.streamURL;
      this.audioEl.load();
    }

    this.emit('loading');
    this.emit('change');

    try {
      await this.audioEl.play();
      this.isPlaying = true;
    } catch (error) {
      this.isPlaying = false;
      this.emit('change');
      this.emit('error');
      throw error;
    }
  };

  stop = (): void => {
    this.stopAudioConnectError();

    if (!this.isPlaying && !this.audioEl.getAttribute('src')) {
      return;
    }

    this.isResettingAudio = true;
    this.audioEl.pause();
    this.audioEl.removeAttribute('src');

    try {
      this.audioEl.load();
    } catch {
      // Browsers can throw here while the element is being reset.
    }

    this.isResettingAudio = false;
    this.isPlaying = false;
    this.emit('stop');
    this.emit('change');
  };

  toggleMute = (): void => {
    this.isMuted = !this.isMuted;
    this.audioEl.volume = this.isMuted ? 0 : this.volume;
    this.emit('volumeChange');
  };

  setVolume(newVolume: number): void {
    this.volume = newVolume;

    if (!this.isMuted) {
      this.audioEl.volume = newVolume;
    }

    this.emit('volumeChange');
  }

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    if (!this.isSupportedEvent(type)) {
      throw new Error(`${type} is not a supported event for the Rainwave Player.`);

      return;
    }

    super.addEventListener(type, callback, options);
  }

  override removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    if (!this.isSupportedEvent(type)) {
      return;
    }

    super.removeEventListener(type, callback, options);
  }

  private detectSupport(): void {
    if (
      !isProbablyMobileBrowser() &&
      this.audioEl.canPlayType('audio/ogg; codecs="vorbis"') !== ''
    ) {
      this.mimetype = 'audio/ogg';
      this.type = 'ogg';
    }
  }

  private createAudioElement(parentElement: HTMLElement): HTMLAudioElement {
    const audioEl = document.createElement('audio');
    audioEl.preload = 'none';
    audioEl.setAttribute('playsinline', '');
    audioEl.volume = this.isMuted ? 0 : this.volume;
    audioEl.addEventListener('abort', this.onAbort);
    audioEl.addEventListener('ended', this.onEnded);
    audioEl.addEventListener('playing', this.onPlaying);
    audioEl.addEventListener('stalled', this.onStall);
    audioEl.addEventListener('suspend', this.onSuspend);
    audioEl.addEventListener('waiting', this.onWaiting);
    audioEl.addEventListener('timeupdate', this.onTimeUpdate);
    audioEl.addEventListener('error', this.onError);

    parentElement.appendChild(audioEl);

    return audioEl;
  }

  private emit(type: RainwavePlayerEventName, detail?: string): void {
    const event = detail === undefined ? new Event(type) : new CustomEvent(type, { detail });
    super.dispatchEvent(event);
  }

  private isSupportedEvent(type: string): type is RainwavePlayerEventName {
    return SUPPORTED_EVENTS.has(type as RainwavePlayerEventName);
  }

  private stopAudioConnectError(): void {
    if (this.stallTimeout) {
      clearTimeout(this.stallTimeout);
      this.stallTimeout = null;
    }

    this.stallActive = false;
  }

  private doAudioConnectError(detail?: string): void {
    if (this.stallActive || this.stallTimeout) {
      return;
    }

    this.stallTimeout = setTimeout(this.dispatchStall.bind(this, detail), this.stallDelay);
  }

  private dispatchStall(detail?: string): void {
    this.emit('stall', detail);
    this.stallTimeout = null;
    this.stallActive = true;
  }

  private onTimeUpdate = (): void => {
    this.stopAudioConnectError();
  };

  private onPlaying = (): void => {
    this.isPlaying = true;
    this.stopAudioConnectError();
    this.emit('playing');
    this.emit('change');
  };

  private onWaiting = (): void => {
    this.doAudioConnectError();
    this.emit('loading');
  };

  private onEnded = (): void => {
    this.isPlaying = false;
    this.emit('stop');
    this.emit('change');
    void this.play();
  };

  private onAbort = (): void => {
    if (this.isResettingAudio) {
      return;
    }

    this.stop();
  };

  private onSuspend = (): void => {
    this.onStall();
  };

  private onStall = (): void => {
    this.doAudioConnectError();
  };

  private onError = (): void => {
    if (this.isResettingAudio) {
      return;
    }

    this.stopAudioConnectError();
    this.isPlaying = false;
    this.emit('error');
    this.emit('change');
  };
}

export { RainwaveAudioBackend };
