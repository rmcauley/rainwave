import { api } from '../../rainwaveApi/api';
import { updateFaveElements, updateFaveElementsAllSongs } from '../fave/updateFaveElements';

const detailPanelsEl = document.getElementById('detail-panels')!;

function initDetailPanels(): void {
  api.addEventListener('fave_album_result', (payload) => {
    updateFaveElements('album-fave', payload, detailPanelsEl);
  });
  api.addEventListener('fave_song_result', (payload) => {
    updateFaveElements('song-fave', payload, detailPanelsEl);
  });
  api.addEventListener('fave_all_songs_result', (payload) => {
    updateFaveElementsAllSongs(payload, detailPanelsEl);
  });
}

export { initDetailPanels };
