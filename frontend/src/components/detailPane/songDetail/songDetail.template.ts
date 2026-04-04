import { $l } from '../../../language';

import type { songDetailContext } from './songDetail.context';
function songDetail(context: songDetailContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = `song_detail`;
  v1.appendChild(v2);
  if (context.artists) {
    const v3 = document.createElement('div');
    v3.className = 'full_artists ' + (context.artists.length > 1 ? 'multi_artist' : '');
    v2.appendChild(v3);
    const v4 = document.createElement('span');
    v4.appendChild(
      document.createTextNode(
        ($l_has('Artists_pluralized')
          ? $l('Artists_pluralized', { count: context.artists.length })
          : $l('Artists')) + ': ',
      ),
    );
    v3.appendChild(v4);
    const v5 = context.artists.map((context) => {
      const v6 = document.createDocumentFragment();
      const v7 = document.createElement('a');
      v7.appendChild(document.createTextNode(context.name));
      v7.href = `#!/artist/` + context.id;
      v6.appendChild(v7);
      v3.appendChild(v6);
      
return { $root: v6 };
    });
  }
  if (context.groups && context.groups.length && !MOBILE) {
    const v8 = document.createElement('div');
    v8.className = 'full_groups ' + (context.groups.length > 1 ? 'multi_group' : '');
    v2.appendChild(v8);
    const v9 = document.createElement('span');
    v9.appendChild(document.createTextNode($l('Groups') + ': '));
    v8.appendChild(v9);
    const v10 = context.groups.map((context) => {
      const v11 = document.createDocumentFragment();
      const v12 = document.createElement('a');
      v12.appendChild(document.createTextNode(context.name));
      v12.href = `#!/group/` + context.id;
      v11.appendChild(v12);
      v8.appendChild(v11);
      
return { $root: v11 };
    });
  }
  if (context.rating_count) {
    const v13 = document.createElement('div');
    v2.appendChild(v13);
    const v14 = document.createElement('span');
    v14.appendChild(document.createTextNode($l('song_rating_detail')));
    v13.appendChild(v14);
    const v15 = document.createElement('span');
    v15.appendChild(
      document.createTextNode(
        $l('rating_detail_numbers', {
          rating: Formatting.rating(context.rating),
          count: context.rating_count,
          percentile: context.rating_rank_percentile,
          percentile_message: context.rating_percentile_message,
        }),
      ),
    );
    v15.setAttribute('style', `margin-left: 2px`);
    v13.appendChild(v15);
    const v16 = document.createElement('div');
    v2.appendChild(v16);
  } else {
    const v17 = document.createElement('div');
    v17.appendChild(document.createTextNode($l('song_has_no_ratings')));
    v2.appendChild(v17);
  }
  
return { $root: v1, details: v2, artists: v5, groups: v10, graph_placement: v16 };
}
export { songDetail };
