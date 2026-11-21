import { textHighlight } from '../../helpers/textHighlight';
import type { components } from '../../rainwaveApi/rainwave-openapi';
import { detailTableTemplate } from '../detailTable/detailTable.template';
import { detailAlbumRow } from './detailAlbumRow/detailAlbumRow';

function detailAlbumsTable(
  albums: components['schemas']['albums'],
  header?: string,
  query?: string,
): HTMLElement {
  const template = detailTableTemplate({ header });
  albums.forEach((album) => {
    const albumTemplate = detailAlbumRow(album);
    if (query) {
      textHighlight(albumTemplate.name, query);
    }
    template.table.appendChild(albumTemplate.$root);
  });

  return template.$root;
}

export { detailAlbumsTable };
