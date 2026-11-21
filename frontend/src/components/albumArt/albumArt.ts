import './albumArt.css';

function setAlbumArt(element: HTMLElement, artUrl: string | null): void {
  element.classList.add('album-art');
  if (!artUrl) {
    element.style.backgroundImage = 'url(/static/images4/noart_1.jpg)';
  } else {
    element.style.backgroundImage = `url(${artUrl}_320.jpg)`;
  }
}

export { setAlbumArt };
