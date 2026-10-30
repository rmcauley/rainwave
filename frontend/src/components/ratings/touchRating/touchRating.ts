import { getViewportHeight, getViewportWidth } from '../../../helpers/getViewportSize';
import type { SongRating } from '../songRating/songRating';

const TOUCH_RATING_WIDTH = 200;
const TOUCH_RATING_HEIGHT = 200;

function startTouchRating(evt: PointerEvent, songRating: SongRating): void {
  let cancelling = false;
  const rating = 0;
  const touchRating = document.createElement('div');
  touchRating.classList.add('rating-touch');

  const x = Math.min(getViewportWidth() - TOUCH_RATING_WIDTH, evt.pageX - TOUCH_RATING_WIDTH / 2);
  const y = Math.min(
    getViewportHeight() - TOUCH_RATING_HEIGHT,
    evt.pageY - TOUCH_RATING_HEIGHT / 2,
  );
  touchRating.style.transform = `translate(${x}px, ${y}px)`;

  const touchRatingNumber = document.createElement('div');
  touchRatingNumber.classList.add('rating-touch-number');
  touchRating.appendChild(touchRatingNumber);
  const touchRatingSlider = document.createElement('div');
  touchRatingNumber.classList.add('rating-touch-slider');
  touchRating.appendChild(touchRatingSlider);

  const onRatingPointerCancel = (): void => {
    document.removeChild(touchRating);
  };

  const onRatingPointerEnd = (): void => {
    if (!cancelling) {
      songRating.submitSongRating(rating);
    }
    document.body.removeChild(touchRating);
  };

  const onRatingPointerMove = (): void => {
    // TODO
    touchRatingNumber.textContent = '0.0';
  };

  const onRatingPointerEnter = (): void => {
    cancelling = false;
  };

  const onRatingPointerLeave = (): void => {
    cancelling = true;
  };

  touchRating.addEventListener('pointercancel', onRatingPointerCancel);
  touchRating.addEventListener('pointerend', onRatingPointerEnd);
  touchRating.addEventListener('pointermove', onRatingPointerMove);
  touchRating.addEventListener('pointerenter', onRatingPointerEnter);
  touchRating.addEventListener('pointerleave', onRatingPointerLeave);
  touchRating.setPointerCapture(evt.pointerId);

  document.body.appendChild(touchRating);
}

export { startTouchRating };
