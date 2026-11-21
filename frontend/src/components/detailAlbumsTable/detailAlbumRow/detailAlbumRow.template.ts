import type { detailAlbumRowContext } from './detailAlbumRow.context';
function detailAlbumRowTemplate(context: detailAlbumRowContext) {
  const v1 = document.createElement('tr');
  v1.className = 'detail-table-row';
  const v2 = document.createElement('td');
  v2.className = 'detail-table-row-fave';
  v1.appendChild(v2);
  const v3 = document.createElement('td');
  v3.appendChild(document.createTextNode(context.album.name));
  v3.className = 'detail-table-row-title';
  v3.setAttribute('title', context.album.name);
  v1.appendChild(v3);
  const v4 = document.createElement('td');
  v4.className = 'detail-table-row-rating';
  v1.appendChild(v4);
  return { $root: v1, row: v1, fave: v2, name: v3, rating: v4 };
}
export { detailAlbumRowTemplate };
