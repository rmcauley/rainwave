function formatRating(r: number): string {
  r = Math.round(r * 10) / 10;
  if ((r * 10) % 10 === 0) {
    return `${r.toString()}.0`;
  } else {
    return r.toString();
  }
}

export { formatRating };
