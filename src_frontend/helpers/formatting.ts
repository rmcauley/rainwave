function getMinuteClock(seconds: number): string {
  if (seconds <= 0) {
    return '0:00';
  }

  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function formatRating(r: number): string {
  r = Math.round(r * 10) / 10;
  if ((r * 10) % 10 === 0) {
    return r.toString() + '.0';
  } else {
    return r.toString();
  }
}

export { formatRating, getMinuteClock };
