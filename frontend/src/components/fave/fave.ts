import { api } from '../../rainwaveApi';
import { fave } from './fave.template';

function doFave(this: HTMLElement): void {
  const faveId = Number(this.dataset.faveId);
  if (Number.isNaN(faveId)) {
    return;
  }
  const isAlbum = this.dataset.faveType === 'album';

  const setTo = !this.classList.contains('is-fave');
  this.classList.add('fave-clicked');
  if (isAlbum) {
    api
      .fetch('fave_album', { fave: setTo, album_id: faveId })
      .catch(() => this.classList.remove('fave-clicked'));
  } else {
    api
      .fetch('fave_song', { fave: setTo, song_id: faveId })
      .catch(() => this.classList.remove('fave-clicked'));
  }
}

function renderFave(
  container: HTMLElement,
  itemId: number,
  isAlbum: boolean,
  isFave: boolean,
): ReturnType<typeof fave> {
  const template = fave(null);

  if (api.user.id >= 1) {
    if (isFave) {
      template.fave.classList.add('is-fave');
      if (template.fave.parentNode instanceof HTMLElement) {
        if (isAlbum) {
          template.fave.parentNode.classList.add('album-fave-highlight');
        } else {
          template.fave.parentNode.classList.add('song-fave-highlight');
        }
      }
    }

    template.fave.dataset.faveId = itemId.toString();
    template.fave.dataset.faveType = isAlbum ? 'album' : 'song';
    template.fave.addEventListener('click', doFave);
  }

  return template;
}

export { renderFave };
