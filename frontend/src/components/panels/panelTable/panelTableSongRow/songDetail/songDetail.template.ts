import { $l } from '../../../../../language';
import type { songDetailContext } from './songDetail.context';
function songDetailTemplate(context: songDetailContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = 'song-detail-artists';
  v1.appendChild(v2);
  const v3 = document.createElement('span');
  v3.appendChild(document.createTextNode($l('Artists') + ': '));
  v3.className = 'song-detail-artists-label';
  v2.appendChild(v3);
  context.artists.forEach((context) => {
    const v4 = document.createElement('a');
    v4.appendChild(document.createTextNode(context.name));
    v4.href = `#!/artist/` + context.id;
    v2.appendChild(v4);
  });
  const v5 = document.createElement('div');
  v5.className = 'song-detail-groups';
  v1.appendChild(v5);
  const v6 = document.createElement('span');
  v6.appendChild(document.createTextNode($l('Groups') + ': '));
  v5.appendChild(v6);
  context.groups.forEach((context) => {
    const v7 = document.createElement('a');
    v7.appendChild(document.createTextNode(context.name));
    v7.href = `#!/group/` + context.id;
    v5.appendChild(v7);
  });
  let v13: HTMLElementTagNameMap['div'] | undefined;
  if (context.ratingDetailText) {
    const v8 = document.createElement('div');
    v1.appendChild(v8);
    const v9 = document.createElement('span');
    v9.appendChild(document.createTextNode($l('song_rating_detail')));
    v8.appendChild(v9);
    const v10 = document.createElement('span');
    v10.appendChild(document.createTextNode(context.ratingDetailText));
    v10.setAttribute('style', `margin-left: 2px`);
    v8.appendChild(v10);
    const v11 = document.createElement('div');
    v1.appendChild(v11);
    v13 = v11;
  } else {
    const v12 = document.createElement('div');
    v12.appendChild(document.createTextNode($l('song_has_no_ratings')));
    v1.appendChild(v12);
  }
  return { $root: v1, graphPlacement: v13 };
}
export { songDetailTemplate };
