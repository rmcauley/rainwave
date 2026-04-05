import { api } from '../../rainwaveApi';

import type { components } from '../../rainwaveApi/rainwave-openapi';
import type { RainwaveCallback } from '../../rainwaveApi/types';

type FaveElement = HTMLElement & { _faveId?: number };

let albumCallback: ((result: components['schemas']['fave_album_result']) => void) | undefined =
  undefined;
function setAlbumCallback(callback: NonNullable<typeof albumCallback>): void {
  albumCallback = callback;
}

function rerenderFave(success: boolean, isFave: boolean, elName: string): void {
  if (!success) {
    return;
  }

  const highlightClassName = elName.startsWith('a')
    ? 'album-fave-highlight'
    : 'song-fave-highlight';
  const funcn = isFave ? 'add' : 'remove';
  document.getElementsByName(elName).forEach((el) => {
    el.classList[funcn]('is-fave');
    el.classList.remove('fave-clicked');
    if (el.parentNode instanceof HTMLElement) {
      el.parentNode.classList[funcn](highlightClassName);
    }
  });
}

const songFaveUpdate: RainwaveCallback<'fave_song_result'> = (result) => {
  rerenderFave(result.success, result.fave, `sfave_${result.id}`);
};

const songFaveAllUpdate: RainwaveCallback<'fave_all_songs_result'> = (result) => {
  result.song_ids.forEach((songId) => {
    rerenderFave(result.success, result.fave, `sfave_${songId}`);
  });
};

const albumFaveUpdate: RainwaveCallback<'fave_album_result'> = (result) => {
  rerenderFave(result.success, result.fave, `afave_${result.id}`);

  if (albumCallback) {
    albumCallback(result);
  }
};

function doFave(this: FaveElement, evt: PointerEvent): void {
  const faveId = this._faveId;
  const faveData = this.dataset.fave;
  if (!faveId || !faveData) {
    return;
  }

  evt.stopPropagation();

  const setTo = !this.classList.contains('is-fave');
  if (faveData.startsWith('s')) {
    api.voidFetch('fave_song', { fave: setTo, song_id: faveId });
  } else {
    api.voidFetch('fave_album', { fave: setTo, album_id: faveId });
  }
  this.classList.add('fave-clicked');
}

function registerFaveRender(
  binds: { fave: FaveElement },
  albumId: number | undefined,
  songId: number | undefined,
  isFave: boolean,
): void {
  if (api.user.id <= 1) {
    return;
  }

  if (isFave) {
    binds.fave.classList.add('is-fave');
    if (binds.fave.parentNode instanceof HTMLElement) {
      if (albumId) {
        binds.fave.parentNode.classList.add('album-fave-highlight');
      } else {
        binds.fave.parentNode.classList.add('song-fave-highlight');
      }
    }
  }
  binds.fave.dataset.fave = albumId ? `afave_${albumId}` : `sfave_${songId}`;
  binds.fave._faveId = albumId || songId;
  binds.fave.addEventListener('click', doFave);
}

function registerFaveApiListeners(): void {
  api.addEventListener('fave_song_result', songFaveUpdate);
  api.addEventListener('fave_album_result', albumFaveUpdate);
  api.addEventListener('fave_all_songs_result', songFaveAllUpdate);
}

export { registerFaveApiListeners, registerFaveRender, setAlbumCallback };
