import { isProbablyMobileBrowser } from '../../../helpers/isProbablyMobile';

type PlayerState = 'idle' | 'connecting' | 'playing' | 'buffering' | 'retrying' | 'failed';

type RainwavePlayerEventName = 'stateChange';

interface PlayerSnapshot {
  state: PlayerState;
  retryAttempt: number;
  maxRetries: number;
}

class RainwaveAudioBackend extends EventTarget {
  audioElDest: HTMLElement | false = false;

  private readonly bufferingDelay = 2000;
  private readonly maxRetries = 5;
  private audioEl: HTMLAudioElement;
  private bufferingTimer: ReturnType<typeof setTimeout> | null = null;
  private isResettingAudioElement = false;
  private playAttemptId = 0;
  private retryAttempt = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly streamURL: string;
  private state: PlayerState = 'idle';

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

  get isActive(): boolean {
    return this.state !== 'idle' && this.state !== 'failed';
  }

  get isPlaying(): boolean {
    return this.state === 'playing';
  }

  get snapshot(): PlayerSnapshot {
    return {
      state: this.state,
      retryAttempt: this.retryAttempt,
      maxRetries: this.maxRetries,
    };
  }

  playToggle = (): void => {
    if (this.isActive) {
      this.stop();

      return;
    }

    this.play();
  };

  play = (): void => {
    if (this.isActive) {
      return;
    }

    this.retryAttempt = 0;
    this.startPlayback();
  };

  stop = (): void => {
    if (this.state === 'idle') {
      return;
    }

    this.invalidatePlayAttempt();
    this.clearBufferingTimer();
    this.clearRetryTimer();
    this.retryAttempt = 0;
    this.transitionTo('idle');
    this.resetAudioElement();
  };

  setOutputVolume(volume: number): void {
    this.audioEl.volume = RainwaveAudioBackend.sanitizeVolume(volume);
  }

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

  private startPlayback(): void {
    this.attachAudioElement();
    this.clearBufferingTimer();
    this.clearRetryTimer();

    if (this.audioEl.src !== this.streamURL) {
      this.audioEl.src = this.streamURL;
      this.audioEl.load();
    }

    this.transitionTo('connecting');
    this.scheduleBufferingStatus();
    this.invalidatePlayAttempt();
    void this.startAudioElementPlayback(this.playAttemptId);
  }

  private async startAudioElementPlayback(playAttemptId: number): Promise<void> {
    try {
      await this.audioEl.play();
    } catch (error) {
      if (playAttemptId !== this.playAttemptId || !this.isActive) {
        return;
      }

      this.handlePlaybackFailure(error);
    }
  }

  private createAudioElement(): HTMLAudioElement {
    const audioEl = document.createElement('audio');
    audioEl.preload = 'none';
    audioEl.setAttribute('playsinline', '');
    audioEl.addEventListener('abort', this.onAbort);
    audioEl.addEventListener('ended', this.onEnded);
    audioEl.addEventListener('error', this.onError);
    audioEl.addEventListener('playing', this.onPlaying);
    audioEl.addEventListener('stalled', this.onSoftTrouble);
    audioEl.addEventListener('suspend', this.onSoftTrouble);
    audioEl.addEventListener('timeupdate', this.onProgress);
    audioEl.addEventListener('waiting', this.onWaiting);

    return audioEl;
  }

  private static sanitizeVolume(volume: number): number {
    if (!Number.isFinite(volume)) {
      return 1;
    }

    return Math.min(Math.max(volume, 0), 1);
  }

  private attachAudioElement(): void {
    if (!this.audioElDest) {
      return;
    }

    if (this.audioEl.parentNode !== this.audioElDest) {
      this.audioElDest.appendChild(this.audioEl);
    }
  }

  private emit(type: RainwavePlayerEventName): void {
    super.dispatchEvent(new Event(type));
  }

  private transitionTo(nextState: PlayerState): void {
    if (this.state === nextState) {
      return;
    }

    this.state = nextState;
    this.emit('stateChange');
  }

  private resetAudioElement(): void {
    this.isResettingAudioElement = true;

    try {
      this.audioEl.pause();
      this.audioEl.removeAttribute('src');

      try {
        this.audioEl.load();
      } catch {
        // Some browsers throw while the media element is being torn down.
      }
    } catch {
      // Some browsers throw while the media element is being torn down.
    } finally {
      this.isResettingAudioElement = false;
    }
  }

  private handlePlaybackFailure(_reason?: unknown): void {
    if (!this.isActive || this.state === 'retrying') {
      return;
    }

    this.clearBufferingTimer();

    if (this.retryAttempt >= this.maxRetries) {
      this.transitionTo('failed');
      this.resetAudioElement();

      return;
    }

    this.retryAttempt++;
    this.transitionTo('retrying');
    this.resetAudioElement();

    const retryDelay = Math.min(1000 * 2 ** (this.retryAttempt - 1), 15000);
    this.retryTimer = setTimeout(this.onRetryTimerElapsed, retryDelay);
  }

  private reconnect(): void {
    if (!this.isActive) {
      return;
    }

    this.invalidatePlayAttempt();
    this.clearBufferingTimer();
    this.clearRetryTimer();
    this.resetAudioElement();
    this.startPlayback();
  }

  private invalidatePlayAttempt(): void {
    this.playAttemptId++;
  }

  private clearBufferingTimer(): void {
    if (!this.bufferingTimer) {
      return;
    }

    clearTimeout(this.bufferingTimer);
    this.bufferingTimer = null;
  }

  private clearRetryTimer(): void {
    if (!this.retryTimer) {
      return;
    }

    clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  private scheduleBufferingStatus(): void {
    if (this.state !== 'connecting' && this.state !== 'playing') {
      return;
    }

    if (this.bufferingTimer) {
      return;
    }

    this.bufferingTimer = setTimeout(this.onBufferingTimerElapsed, this.bufferingDelay);
  }

  private onBufferingTimerElapsed = (): void => {
    this.bufferingTimer = null;

    if (this.state !== 'connecting' && this.state !== 'playing') {
      return;
    }

    this.transitionTo('buffering');
    this.handlePlaybackFailure();
  };

  private onRetryTimerElapsed = (): void => {
    this.retryTimer = null;

    if (this.state !== 'retrying') {
      return;
    }

    this.startPlayback();
  };

  private onAbort = (): void => {
    if (this.isResettingAudioElement || !this.isActive) {
      return;
    }

    this.handlePlaybackFailure();
  };

  private onEnded = (): void => {
    if (this.isResettingAudioElement || !this.isActive) {
      return;
    }

    this.reconnect();
  };

  private onError = (): void => {
    if (this.isResettingAudioElement || !this.isActive) {
      return;
    }

    this.handlePlaybackFailure(this.audioEl.error);
  };

  private onPlaying = (): void => {
    if (this.isResettingAudioElement) {
      return;
    }

    this.clearBufferingTimer();
    this.clearRetryTimer();
    this.retryAttempt = 0;
    this.transitionTo('playing');
  };

  private onProgress = (): void => {
    if (this.isResettingAudioElement) {
      return;
    }

    this.clearBufferingTimer();
  };

  private onSoftTrouble = (): void => {
    if (this.isResettingAudioElement) {
      return;
    }

    this.scheduleBufferingStatus();
  };

  private onWaiting = (): void => {
    if (this.isResettingAudioElement) {
      return;
    }

    this.scheduleBufferingStatus();
  };
}

export { RainwaveAudioBackend };
export type { PlayerSnapshot, PlayerState };
