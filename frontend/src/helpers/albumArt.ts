function getAlbumArt(song: { albums: [{ art: string | null | undefined }] }): string {
  return song.albums[0].art ? `${song.albums[0].art  }_320.jpg` : '/static/images4/noart_1.jpg';
}

export { getAlbumArt };
