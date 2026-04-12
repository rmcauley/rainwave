import { $l } from '../../language';
import { songTable } from '../detailPane/songTable/songTable.template';
import { fave } from '../fave/fave.template';
import { rating } from '../ratings/rating.template';

import type { searchResultsContext } from './searchResults.context';

import style from './searchResults.module.scss';


function searchResults(context: searchResultsContext) {
  const v1 = document.createDocumentFragment();
  if (context.artists.length) {
    const v2 = document.createElement('h2');
    v2.appendChild(document.createTextNode($l('Artists')));
    v1.appendChild(v2);

    const v3 = context.artists.map((context) => {
      const v4 = document.createDocumentFragment();

      const v5 = document.createElement('div');
      v5.className = style['row row-artist'];
      v4.appendChild(v5);

      const v6 = document.createElement('div');
      v6.className = style.title;
      v5.appendChild(v6);

      const v7 = document.createElement('a');
      v7.appendChild(document.createTextNode(context.name));
      v7.href = `#!/artist/` + context.id;
      v6.appendChild(v7);
      v1.appendChild(v4);
      
return { title: v7, $root: v4 };
    });
    if (context.artists.length >= 50) {
      const v8 = document.createElement('div');
      v8.appendChild(document.createTextNode($l('search_result_limit')));
      v8.className = style['row search-oob'];
      v1.appendChild(v8);
    }
  }
  if (context.albums.length) {
    const v9 = document.createElement('h2');
    v9.appendChild(document.createTextNode($l('Albums')));
    v1.appendChild(v9);

    const v10 = context.albums.map((context) => {
      const v11 = document.createDocumentFragment();

      const v12 = document.createElement('div');
      v12.setAttribute(
        'data-old-class',
        'row row-album ' +
          (context.cool ? 'cool' : '') +
          ' ' +
          (context.fave ? 'song-fave-highlight' : ''),
      );
      v11.appendChild(v12);
      v12.appendChild(rating(context).$root);
      v12.appendChild(fave(context).$root);

      const v13 = document.createElement('div');
      v13.className = style.title;
      v12.appendChild(v13);

      const v14 = document.createElement('a');
      v14.appendChild(document.createTextNode(context.name));
      v14.href = `#!/album/` + context.id;
      v13.appendChild(v14);
      v1.appendChild(v11);
      
return { title: v14, $root: v11 };
    });
    if (context.albums.length >= 50) {
      const v15 = document.createElement('div');
      v15.appendChild(document.createTextNode($l('search_result_limit')));
      v15.className = style['row search-oob'];
      v1.appendChild(v15);
    }
  }
  if (context.songs.length) {
    const v16 = document.createElement('h2');
    v16.appendChild(document.createTextNode($l('Songs')));
    v1.appendChild(v16);
    v1.appendChild(songTable(context).$root);
    if (context.songs.length >= 100) {
      const v17 = document.createElement('div');
      v17.appendChild(document.createTextNode($l('search_result_limit')));
      v17.className = style['row search-oob'];
      v1.appendChild(v17);
    }
  }
  
return { $root: v1, artists: v3, albums: v10 };
}
export { searchResults };
