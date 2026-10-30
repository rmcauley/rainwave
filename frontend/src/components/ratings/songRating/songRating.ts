import { formatRating } from '../../../helpers/formatRating';
import { hasTouchInput } from '../../../helpers/hasTouchInput';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { showErrorTooltip } from '../../errorTooltip/errorTooltip';
import { BaseRating } from '../baseRating/baseRating';
import { startTouchRating } from '../touchRating/touchRating';
import { getPreciseRatingFromMouse, getRatingFromMouse } from './getRatingFromMouse';

class SongRating extends BaseRating {
  static create(
    itemId: number,
    userRating: number | null,
    globalRating: number | null,
  ): SongRating {
    const element = document.createElement('song-rating');
    element.render(itemId, userRating, globalRating);

    if (api.user.id > 1) {
      if (hasTouchInput) {
        element.addEventListener('pointerdown', element.onRatingPointerDown);
      }

      element.addEventListener('click', element.onRatingClick);
      element.addEventListener('mousemove', element.onRatingMouseMove);
      element.addEventListener('mouseleave', element.onRatingMouseLeave);
    }

    return element;
  }

  onRatingError = (confirmElement: HTMLElement): void => {
    confirmElement.textContent = '!';
    confirmElement.classList.add('song-rating-confirm-error');
    setTimeout(() => {
      confirmElement.style.opacity = '0';
      setTimeout(() => {
        this.removeChild(confirmElement);
      }, 250);
    }, 1500);
  };

  submitSongRating = (newRating: number): void => {
    const songId = Number(this.dataset.songId);
    if (!songId || Number.isNaN(songId)) {
      return;
    }

    const confirm = document.createElement('div');
    confirm.className = 'song-rating-confirm';
    confirm.textContent = formatRating(newRating);
    confirm.style.transform = `translateX(${Math.round((newRating / 5.0) * 50 - 15)}px) scaleX(0.2)`;
    this.insertBefore(confirm, this.firstChild);
    requestAnimationFrame(() => {
      confirm.classList.add('song-rating-confirm--confirming');
    });

    api
      .fetch('rate', { rating: newRating, song_id: songId })
      .then((payload) => {
        this.onRatingResult(payload.rate_result, confirm);
      })
      .catch((err: unknown) => {
        showErrorTooltip(err, this);
      });
  };

  onRatingResult = (payload: components['schemas']['rate_result'], confirm: HTMLElement): void => {
    if (!payload.success) {
      showErrorTooltip(payload.text, this);
      this.onRatingError(confirm);
    } else {
      requestAnimationFrame(() => {
        confirm.classList.add('song-rating-confirm--confirmed');
      });
    }
    // Do not set this.rating here - the global rate_result API handler does this
    setTimeout(() => {
      confirm.classList.add('song-rating-confirm--fading');
      confirm.style.opacity = '0';
      setTimeout(() => {
        this.removeChild(confirm);
      }, 250);
    }, 1500);
  };

  onRatingClick = (evt: MouseEvent): void => {
    this.submitSongRating(getRatingFromMouse(evt));
  };

  onRatingMouseMove = (evt: MouseEvent): void => {
    this.hoverRating = getPreciseRatingFromMouse(evt);
  };

  onRatingMouseLeave = (): void => {
    this.hoverRating = null;
  };

  onRatingPointerDown = (evt: PointerEvent): void => {
    startTouchRating(evt, this);
  };
}

customElements.define('song-rating', SongRating);

declare global {
  interface HTMLElementTagNameMap {
    'song-rating': SongRating;
  }
}

export { SongRating };
