import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { AlbumFave } from '../../fave/albumFave/albumFave';
import { AlbumRating } from '../../ratings/albumRating/albumRating';
import { detailAlbumRowTemplate } from './detailAlbumRow.template';

function detailAlbumRow(
  album: components['schemas']['albums'][number],
): ReturnType<typeof detailAlbumRowTemplate> {
  const template = detailAlbumRowTemplate({
    album,
  });

  if (album.cool) {
    template.$root.classList.add('panel-table-row--cool');
  }

  template.fave.appendChild(AlbumFave.create(album.id, album, template.name));
  template.rating.appendChild(
    AlbumRating.create(album.id, album.rating_user, album.rating, album.rating_complete),
  );

  return template;
}

export { detailAlbumRow };
