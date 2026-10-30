import type { components } from '../../rainwaveApi/rainwave-openapi';
import type { BaseFave } from './baseFave/baseFave';

function performUpdate(
  rootElement: HTMLElement,
  tag: 'song-fave' | 'album-fave',
  itemId: number,
  fave: boolean,
): void {
  const faveElements = rootElement.querySelectorAll<BaseFave>(`${tag}[data-item-id="${itemId}"]`);
  faveElements.forEach((faveElement) => {
    faveElement.fave = fave;
  });
}

function updateFaveElements(
  tag: 'song-fave' | 'album-fave',
  payload: components['schemas']['fave_album_result'] | components['schemas']['fave_song_result'],
  rootElement: HTMLElement,
): void {
  // Errors are handled in the individual fave functions, not globally here.
  if (!payload.success) {
    return;
  }

  performUpdate(rootElement, tag, payload.id, payload.fave);
}

function updateFaveElementsAllSongs(
  payload: components['schemas']['fave_all_songs_result'],
  rootElement: HTMLElement,
): void {
  if (!payload.success) {
    return;
  }
  payload.song_ids.forEach((songId) => {
    performUpdate(rootElement, 'song-fave', songId, payload.fave);
  });
}

export { updateFaveElements, updateFaveElementsAllSongs };
