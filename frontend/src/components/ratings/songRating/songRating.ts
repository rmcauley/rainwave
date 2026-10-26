import { formatRating } from '../../../helpers/formatRating';
import { api } from '../../../rainwaveApi/api';
import type { RainwaveResponse } from '../../../rainwaveApi/types';
import { BaseRating } from '../baseRating/baseRating';

class SongRating extends BaseRating {
  getRatingFromMouse = (evt: MouseEvent): number => {
    if (evt.offsetX < 0 || evt.offsetY < 0) {
      return 1;
    }
    const result = Math.round(((evt.offsetX - 4 + (18 - evt.offsetY) * 0.5) / 10) * 2) / 2;
    if (result <= 1) {
      return 1;
    } else if (result >= 5) {
      return 5;
    }

    return result;
  };

  onRatingError = (
    newRating: RainwaveResponse<'rate'>['rate_result']['rating_user'],
    confirmElement: HTMLElement,
  ): void => {
    if (newRating === null) {
      confirmElement.textContent = 'x';
    } else {
      confirmElement.textContent = '!';
    }
    confirmElement.classList.add('song-rating-confirm-error');
    setTimeout(function () {
      confirmElement.style.opacity = '0';
      setTimeout(function () {
        confirmElement.parentNode?.removeChild(confirmElement);
      }, 250);
    }, 1500);
  };

  submitSongRating = async (evt: MouseEvent): Promise<void> => {
    const songId = Number(this.dataset.songId);
    if (!songId || Number.isNaN(songId)) {
      return;
    }

    const newRating = this.getRatingFromMouse(evt);

    const confirm = document.createElement('div');
    confirm.className = 'song-rating-confirm';
    confirm.textContent = formatRating(newRating);
    confirm.style.transform = `translateX(${Math.round((newRating / 5.0) * 50 - 15)}px) scaleX(0.2)`;
    this.insertBefore(confirm, this.firstChild);
    requestAnimationFrame(() => {
      confirm.classList.add('song-rating-confirm--confirming');
    });

    try {
      const payload = await api.fetch('rate', { rating: newRating, song_id: songId });
      if (!payload.rate_result.success) {
        this.onRatingError(payload.rate_result.rating_user, confirm);
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
          confirm.parentNode?.removeChild(confirm);
        }, 250);
      }, 1500);
    } catch (
      // oxlint-disable-next-line no-unused-vars
      _err
    ) {
      this.onRatingError(this.userRating, confirm);
    }
  };

  showOrHideRatingClear = (): void => {
    const ratingClearButton = this.querySelector('.rating-clear-button');
    if (ratingClearButton) {
      if (this.userRating > 0) {
        ratingClearButton.classList.add('rating-clear-button--enabled');
      } else {
        ratingClearButton.classList.remove('rating-clear-button--enabled');
      }
    }
  };
}

customElements.define('song-rating', SongRating);

declare global {
  interface HTMLElementTagNameMap {
    'song-rating': SongRating;
  }
}

export { SongRating };
