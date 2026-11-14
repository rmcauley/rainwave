import type { panelSongsTableContext } from './panelSongsTable.context';
function panelSongsTableTemplate(context: panelSongsTableContext) {
  const v1 = document.createElement('div');
  v1.className = 'panel-songs';
  if (context.header) {
    const v2 = document.createElement('div');
    v2.appendChild(document.createTextNode(context.header));
    v2.className = 'panel-songs-header';
    v1.appendChild(v2);
  }
  const v3 = document.createElement('table');
  v3.className = 'panel-songs-table';
  v1.appendChild(v3);
  return { $root: v1, table: v3 };
}
export { panelSongsTableTemplate };
