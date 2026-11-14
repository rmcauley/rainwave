import { preferences } from '../../../../preferences/preferences';
import type { components } from '../../../../rainwaveApi/rainwave-openapi';
import { AlbumFave } from '../../../fave/albumFave/albumFave';
import { AlbumRating } from '../../../ratings/albumRating/albumRating';
import { panelTableAlbumRowTemplate } from './panelTableAlbumRow.template';

function panelTableAlbumRow(
  album: components['schemas']['albums'][number],
): ReturnType<typeof panelTableAlbumRowTemplate> {
  const template = panelTableAlbumRowTemplate({
    album,
    power: preferences.store.powerUserMode,
  });

  if (album.cool) {
    template.$root.classList.add('panel-table-row--cool');
  }

  template.fave.appendChild(AlbumFave.create(album.id, album.fave, template.name));
  template.rating.appendChild(
    AlbumRating.create(album.id, album.rating_user, album.rating, album.rating_complete),
  );

  return template;
}

export { panelTableAlbumRow };
