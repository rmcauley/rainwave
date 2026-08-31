import { widgetScale } from './config';
import { nowPlayingFromSchedule } from './nowPlaying';
import type { NowPlaying, TimelineEntry, WidgetConfig } from './types';

function classForAnimation(animation: string, phase: 'enter' | 'exit'): string {
  return `rw-${phase}-${animation.replace('to_', '')}`;
}

function textShadow(config: WidgetConfig): string {
  const shadows: string[] = [];
  const strokePx = Number.parseInt(config.textStrokeSize, 10);
  if (config.textStrokeColor && Number.isFinite(strokePx) && strokePx > 0) {
    const blur = Math.ceil(strokePx / 2);
    shadows.push(
      `-${config.textStrokeSize} -${config.textStrokeSize} ${blur}px ${config.textStrokeColor}`,
      `${config.textStrokeSize} -${config.textStrokeSize} ${blur}px ${config.textStrokeColor}`,
      `-${config.textStrokeSize} ${config.textStrokeSize} ${blur}px ${config.textStrokeColor}`,
      `${config.textStrokeSize} ${config.textStrokeSize} ${blur}px ${config.textStrokeColor}`,
    );
  }
  if (config.textShadow) {
    shadows.push(config.textShadow);
  }

  return shadows.join(', ');
}

function applyConfigStyles(root: HTMLElement, config: WidgetConfig): void {
  root.style.setProperty('--rw-color', config.color);
  root.style.setProperty('--rw-background', config.backgroundColor || 'transparent');
  root.style.setProperty('--rw-box-shadow', config.boxShadow || 'none');
  root.style.setProperty('--rw-font-size', config.fontSize);
  root.style.setProperty('--rw-font-family', config.fontFamily);
  root.style.setProperty('--rw-text-shadow', textShadow(config) || 'none');
  root.style.setProperty('--rw-art-shadow', config.artShadow || config.textShadow || 'none');
  root.style.setProperty('--rw-width', config.maxWidth);
  root.style.setProperty('--rw-padding', config.padding);
  root.style.setProperty('--rw-art-size', config.artSize);
  root.style.setProperty('--rw-header-color', config.npColor);
  root.style.setProperty('--rw-scale', String(widgetScale(config)));
  root.dataset.layout = config.layout;
  root.dataset.align = config.textAlign;
  root.dataset.presentation = config.presentationMode;
}

function createElement(tag: string, className: string, text = ''): HTMLElement {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;

  return element;
}

function renderCard(config: WidgetConfig, nowPlaying: NowPlaying): HTMLElement {
  const card = createElement('section', 'rw-card');
  const art = document.createElement('img');
  art.className = 'rw-art';
  art.src = nowPlaying.artUrl;
  art.alt = '';
  art.decoding = 'async';

  const text = createElement('div', 'rw-text');
  text.appendChild(createElement('div', 'rw-title', nowPlaying.title));
  if (config.showArtist && nowPlaying.artist) {
    text.appendChild(createElement('div', 'rw-artist', nowPlaying.artist));
  }
  if (nowPlaying.album) {
    text.appendChild(createElement('div', 'rw-album', nowPlaying.album));
  }
  if (nowPlaying.requester) {
    text.appendChild(createElement('div', 'rw-requester', `Requested by ${nowPlaying.requester}`));
  }

  if (config.layout === 'art_bottom' || config.layout === 'art_right') {
    card.append(text, art);
  } else if (config.artSize === '0px') {
    card.appendChild(text);
  } else {
    card.append(art, text);
  }

  return card;
}

class OverlayRenderer {
  private readonly root: HTMLElement;
  private readonly config: WidgetConfig;
  private currentCard: HTMLElement | null = null;
  private hideTimer: number | null = null;
  private delayedTimer: number | null = null;
  private songCount = 0;

  constructor(root: HTMLElement, config: WidgetConfig) {
    this.root = root;
    this.config = config;
    this.root.className = 'rw-overlay';
    applyConfigStyles(this.root, config);
    if (this.config.npHeader) {
      this.root.appendChild(createElement('header', 'rw-header', this.config.npMessage));
    }
    const frame = createElement('div', 'rw-frame');
    this.root.appendChild(frame);
  }

  showSchedule(entry: TimelineEntry): void {
    const nowPlaying = nowPlayingFromSchedule(entry, this.config);
    if (!nowPlaying) {
      return;
    }
    if (this.delayedTimer) {
      clearTimeout(this.delayedTimer);
    }
    this.delayedTimer = setTimeout(() => {
      this.showNowPlaying(nowPlaying);
    }, this.config.delay * 1000) as unknown as number;
  }

  showStatus(message: string): void {
    const frame = this.frame();
    frame.textContent = message;
    frame.classList.add('rw-status');
  }

  private showNowPlaying(nowPlaying: NowPlaying): void {
    const frame = this.frame();
    frame.classList.remove('rw-status');
    frame.textContent = '';
    this.songCount += 1;
    const card =
      this.shouldShowAttribution() && this.config.attributionFrequency > 0
        ? this.renderAttributionCard()
        : renderCard(this.config, nowPlaying);
    card.classList.add('rw-entering', classForAnimation(this.config.animIn, 'enter'));

    if (this.currentCard) {
      const oldCard = this.currentCard;
      oldCard.classList.add('rw-exiting', classForAnimation(this.config.animOut, 'exit'));
      frame.appendChild(oldCard);
      setTimeout(() => {
        oldCard.remove();
      }, 600);
    }

    frame.appendChild(card);
    requestAnimationFrame(() => {
      card.classList.remove('rw-entering');
    });
    this.currentCard = card;
    this.scheduleHide();
  }

  private renderAttributionCard(): HTMLElement {
    return renderCard(this.config, {
      id: -1,
      title: 'Rainwave.cc',
      artist: this.config.adMessage,
      album: '',
      artUrl: 'https://rainwave.cc/static/images4/logo.png',
      requester: null,
    });
  }

  private shouldShowAttribution(): boolean {
    return (
      this.config.attributionFrequency > 0 &&
      this.songCount % this.config.attributionFrequency === 0
    );
  }

  private scheduleHide(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    if (this.config.showDurationWhenChanged === null) {
      return;
    }
    this.hideTimer = setTimeout(() => {
      this.currentCard?.classList.add('rw-hidden');
    }, this.config.showDurationWhenChanged) as unknown as number;
  }

  private frame(): HTMLElement {
    const frame = this.root.querySelector<HTMLElement>('.rw-frame');
    if (!frame) {
      throw new Error('Overlay frame missing.');
    }

    return frame;
  }
}

export { OverlayRenderer, applyConfigStyles, renderCard, textShadow };
