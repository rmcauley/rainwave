function getAlbumArt(art: string | null | undefined): string {
  return art ? `${art}_320.jpg` : '/static/images4/noart_1.jpg';
}

export { getAlbumArt };
