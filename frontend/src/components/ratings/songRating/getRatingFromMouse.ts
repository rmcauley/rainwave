const RATING_LEFT_PADDING = 4;
const RATING_SLOPE_HEIGHT = 18;

// Returns a number between 10 and 50, which can be used to calculate
// the final rating value of 1.0 to 5.0.
function getPreciseRatingFromMouse(evt: MouseEvent): number {
  if (evt.offsetX < RATING_LEFT_PADDING || evt.offsetY < 0) {
    return 10;
  }
  return Math.max(
    10,
    Math.min(50, evt.offsetX - RATING_LEFT_PADDING + (RATING_SLOPE_HEIGHT - evt.offsetY)),
  );
}

function getRatingFromMouse(evt: MouseEvent): number {
  if (evt.offsetX < 0 || evt.offsetY < 0) {
    return 1;
  }
  // Rounding works as e.g. precise rating returns 38 (3.8), divide by 5
  // gives 7.6, round goes to 8, divide by 2 = 4.0.
  const result = Math.round(getPreciseRatingFromMouse(evt) / 5) / 2;
  if (result <= 1) {
    return 1;
  } else if (result >= 5) {
    return 5;
  }

  return result;
}

export { getPreciseRatingFromMouse, getRatingFromMouse };
