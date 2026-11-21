import type { detailArtistRowContext } from './detailArtistRow.context';
function detailArtistRowTemplate(context: detailArtistRowContext) {
  const v1 = document.createElement('tr');
  v1.className = 'detail-table-row';
  const v2 = document.createElement('td');
  v2.className = 'detail-table-row-title';
  v2.setAttribute('title', context.name);
  v1.appendChild(v2);
  const v3 = document.createElement('a');
  v3.appendChild(document.createTextNode(context.name));
  v3.href = `#!/artist/` + context.id;
  v2.appendChild(v3);
  return { $root: v1, name: v2 };
}
export { detailArtistRowTemplate };
