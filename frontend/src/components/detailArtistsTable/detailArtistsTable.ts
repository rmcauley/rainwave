import { textHighlight } from '../../helpers/textHighlight';
import type { components } from '../../rainwaveApi/rainwave-openapi';
import { detailTableTemplate } from '../detailTable/detailTable.template';
import { detailArtistRowTemplate } from './detailArtistRow/detailArtistRow.template';

function detailArtistsTable(
  artists: components['schemas']['artists'],
  header?: string,
  query?: string,
): HTMLElement {
  const template = detailTableTemplate({ header });
  artists.forEach((artist) => {
    const artistTemplate = detailArtistRowTemplate(artist);
    if (query) {
      textHighlight(artistTemplate.name, query);
    }
    template.table.appendChild(artistTemplate.$root);
  });

  return template.$root;
}

export { detailArtistsTable };
