function getCountdownClockFormatted(seconds: number): string {
  if (seconds <= 0) {
    return '0:00';
  }

  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export { getCountdownClockFormatted };
