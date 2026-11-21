import type { detailTableContext } from './detailTable.context';
function detailTableTemplate(context: detailTableContext) {
  const v1 = document.createElement('div');
  v1.className = 'detail-table';
  if (context.header) {
    const v2 = document.createElement('div');
    v2.appendChild(document.createTextNode(context.header));
    v2.className = 'detail-table-header';
    v1.appendChild(v2);
  }
  const v3 = document.createElement('table');
  v3.className = 'detail-table-table';
  v1.appendChild(v3);
  return { $root: v1, table: v3 };
}
export { detailTableTemplate };
