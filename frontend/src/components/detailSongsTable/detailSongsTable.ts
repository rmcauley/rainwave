import { textHighlight } from '../../helpers/textHighlight';
import { detailTableTemplate } from '../detailTable/detailTable.template';
import { detailSongRow } from './detailSongRow/detailSongRow';
import type { DetailSong } from './detailSongRow/detailSongRow.context';
import { detailSongsTableSort } from './detailSongsTableSort';

function detailSongsTable(songs: Array<DetailSong>, header?: string, query?: string): HTMLElement {
  const template = detailTableTemplate({ header });
  songs.toSorted(detailSongsTableSort).map((song) => {
    const songTemplate = detailSongRow(song);
    if (query) {
      textHighlight(songTemplate.title, query);
    }
    template.table.appendChild(songTemplate.$root);
    return songTemplate;
  });

  return template.$root;
}

export { detailSongsTable };
