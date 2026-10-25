import './albumArt.scss';

// function normalizeArt(_evt: MouseEvent, element: HTMLElement): void {
//   element.classList.remove('album-art--expanded');
//   element.classList.remove('album-art--expanded--right');
//   element.classList.remove('album-art--expanded--left');
//   element.classList.remove('album-art--expanded--down');
//   element.classList.remove('album-art--expanded--up');
// }

// function onAlbumArtClick(evt: MouseEvent, element: HTMLElement): void {
//   evt.stopPropagation();

//   if (!element.classList.contains('album-art')) {
//     return;
//   }
//   if (element.classList.contains('album-art--expanded')) {
//     normalizeArt(evt, element);
//     return;
//   }

//   element.classList.add('album-art--expanded');
//   if (evt.pageX < getViewportWidth() - 270) {
//     element.classList.add('album-art--expanded--right');
//   } else {
//     element.classList.add('album-art--expanded--left');
//   }
//   if (evt.pageY < getViewportHeight() - 270) {
//     element.classList.add('album-art--expanded--down');
//   } else {
//     element.classList.add('album-art--expanded--up');
//   }
// }

function setAlbumArt(element: HTMLElement, artUrl: string | null): void {
  element.classList.add('album-art');
  if (!artUrl) {
    element.style.backgroundImage = 'url(/static/images4/noart_1.jpg)';
  } else {
    element.style.backgroundImage = `url(${artUrl}_320.jpg)`;
    // if (!isProbablyMobileBrowser) {
    //   element.addEventListener('click', (evt) => onAlbumArtClick(evt, element));
    //   element.addEventListener('mouseleave', (evt) => normalizeArt(evt, element));
    // }
  }
}

export { setAlbumArt };
