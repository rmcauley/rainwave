import { songTable } from '../songTable/songTable.template';

import type { groupDetailContext } from './groupDetail.context';
function groupDetail(context: groupDetailContext) {
  const v1 = document.createDocumentFragment();
  const v2 = context.albums.map((context) => {
    const v3 = document.createDocumentFragment();
    const v4 = document.createElement('h2');
    v3.appendChild(v4);
    const v5 = document.createElement('a');
    v5.appendChild(document.createTextNode(context.name));
    v5.href = `#!/album/` + context.id;
    v4.appendChild(v5);
    v3.appendChild(songTable(context).$root);
    v1.appendChild(v3);
    
return { $root: v3 };
  });
  
return { $root: v1, albums: v2 };
}
export { groupDetail };
