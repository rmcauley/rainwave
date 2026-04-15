import { isProbablyMobileBrowser } from '../../helpers/isProbablyMobile';

type RainwavePlayerEventName =
  | 'playing'
  | 'stop'
  | 'change'
  | 'volumeChange'
  | 'loading'
  | 'stall'
  | 'error';

type PlaybackState = 'idle' | 'loading' | 'playing' | 'stalled' | 'stopping' | 'error';

class RainwaveAudioBackend extends EventTarget {
  debug = false;
  audioElDest: HTMLElement | false = false;
  isPlaying = false;
  volume = 1.0;
  isMuted = false;

  private readonly stallDelay = 2000;
  private audioEl: HTMLAudioElement;
  private stallTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly streamURL: string;
  private state: PlaybackState = 'idle';

  constructor(streamURL: string, parentElement: HTMLElement) {
    super();

    this.audioEl = this.createAudioElement();
    let fileType = 'mp3';
    if (
      !isProbablyMobileBrowser() &&
      this.audioEl.canPlayType('audio/ogg; codecs="vorbis"') !== ''
    ) {
      fileType = 'ogg';
    }

    this.streamURL = `${streamURL}.${fileType}`;

    parentElement.appendChild(this.audioEl);
  }

  playToggle = async (): Promise<void> => {
    if (this.isPlaying) {
      this.stop();

      return;
    }

    await this.play();
  };

  play = async (): Promise<void> => {
    if (this.state === 'loading' || this.state === 'playing') {
      return;
    }

    this.attachAudioElement();
    this.clearStallTimer();

    if (this.audioEl.src !== this.streamURL) {
      this.audioEl.src = this.streamURL;
      this.audioEl.load();
    }

    this.transitionTo('loading');

    try {
      await this.audioEl.play();
    } catch (error) {
      if (this.state === 'stopping') {
        return;
      }

      this.transitionTo('error');
      this.emit('error');
      throw error;
    }
  };

  stop = (): void => {
    if (this.state === 'idle' || this.state === 'stopping') {
      return;
    }

    this.clearStallTimer();
    this.transitionTo('stopping');

    this.audioEl.pause();
    this.audioEl.removeAttribute('src');

    try {
      this.audioEl.load();
    } catch {
      // Some browsers throw while the media element is being torn down.
    }

    this.transitionTo('idle');
    this.emit('stop');
  };

  toggleMute = (): void => {
    this.isMuted = !this.isMuted;
    this.audioEl.volume = this.isMuted ? 0 : this.volume;
    this.emit('volumeChange');
  };

  setVolume = (newVolume: number): void => {
    this.volume = newVolume;

    if (!this.isMuted) {
      this.audioEl.volume = newVolume;
    }

    this.emit('volumeChange');
  };

  override addEventListener(
    type: RainwavePlayerEventName,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void {
    super.addEventListener(type, callback, options);
  }

  override removeEventListener(
    type: RainwavePlayerEventName,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void {
    super.removeEventListener(type, callback, options);
  }

  private createAudioElement(): HTMLAudioElement {
    const audioEl = document.createElement('audio');
    audioEl.preload = 'none';
    audioEl.setAttribute('playsinline', '');
    audioEl.volume = this.isMuted ? 0 : this.volume;
    audioEl.addEventListener('abort', this.onAbort);
    audioEl.addEventListener('ended', this.onEnded);
    audioEl.addEventListener('error', this.onError);
    audioEl.addEventListener('playing', this.onPlaying);
    audioEl.addEventListener('stalled', this.onStalled);
    audioEl.addEventListener('suspend', this.onSuspend);
    audioEl.addEventListener('timeupdate', this.onTimeUpdate);
    audioEl.addEventListener('waiting', this.onWaiting);

    return audioEl;
  }

  private attachAudioElement(): void {
    if (!this.audioElDest) {
      return;
    }

    if (this.audioEl.parentNode !== this.audioElDest) {
      this.audioElDest.appendChild(this.audioEl);
    }
  }

  private emit(type: RainwavePlayerEventName, detail?: string): void {
    const event = detail === undefined ? new Event(type) : new CustomEvent(type, { detail });
    super.dispatchEvent(event);
  }

  private transitionTo(nextState: PlaybackState): void {
    if (this.state === nextState) {
      return;
    }

    this.state = nextState;
    this.isPlaying = nextState === 'playing';

    if (nextState === 'loading') {
      this.emit('loading');
    } else if (nextState === 'playing') {
      this.emit('playing');
    }

    this.emit('change');
  }

  private clearStallTimer(): void {
    if (!this.stallTimer) {
      return;
    }

    clearTimeout(this.stallTimer);
    this.stallTimer = null;
  }

  private scheduleStallStatus(): void {
    if (this.state !== 'loading' && this.state !== 'playing' && this.state !== 'stalled') {
      return;
    }

    if (this.stallTimer) {
      return;
    }

    this.stallTimer = setTimeout(this.onStallTimerElapsed, this.stallDelay);
  }

  private onStallTimerElapsed = (): void => {
    this.stallTimer = null;

    if (this.state !== 'loading' && this.state !== 'playing' && this.state !== 'stalled') {
      return;
    }

    this.transitionTo('stalled');
    this.emit('stall');
  };

  private onAbort = (): void => {
    if (this.state === 'stopping' || this.state === 'idle') {
      return;
    }

    this.stop();
  };

  private onEnded = (): void => {
    this.clearStallTimer();
    this.transitionTo('idle');
    this.emit('stop');
    void this.play();
  };

  private onError = (): void => {
    if (this.state === 'stopping' || this.state === 'idle') {
      return;
    }

    this.clearStallTimer();
    this.transitionTo('error');
    this.emit('error');
  };

  private onPlaying = (): void => {
    this.clearStallTimer();
    this.transitionTo('playing');
  };

  private onStalled = (): void => {
    this.scheduleStallStatus();
  };

  private onSuspend = (): void => {
    this.scheduleStallStatus();
  };

  private onTimeUpdate = (): void => {
    this.clearStallTimer();
  };

  private onWaiting = (): void => {
    if (this.state === 'playing') {
      this.transitionTo('loading');
    }

    this.scheduleStallStatus();
  };
}

export { RainwaveAudioBackend };
