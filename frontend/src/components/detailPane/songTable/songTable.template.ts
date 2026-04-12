import { fave } from '../../fave/fave.template';
import { rating } from '../../ratings/rating.template';

import type { songTableContext } from './songTable.context';

import style from './songTable.module.scss';

function songTable(context: songTableContext) {
  const v1 = document.createDocumentFragment();

  const v2 = context.songs.map((context) => {
    const v3 = document.createDocumentFragment();

    const v4 = document.createElement('div');
    v4.setAttribute(
      'data-old-class',
      'row ' +
        (context.cool ? 'cool' : '') +
        ' ' +
        (context.fave ? 'song-fave-highlight' : '') +
        ' ' +
        (context.requestable ? 'requestable' : 'unrequestable') +
        ' ' +
        (context.is_new ? 'is-new' : context.is_newish ? 'is-newish' : ''),
    );
    v3.appendChild(v4);
    if (!MOBILE) {
      if (Sizing.simple) {
        if (context.url) {
          const v5 = document.createElement('a');
          v5.className = style.url;
          v5.href = context.url;
          v5.setAttribute('target', `_blank`);
          v4.appendChild(v5);
        } else {
          const v6 = document.createElement('div');
          v6.className = style['fake-url'];
          v4.appendChild(v6);
        }
      }
      if (!Sizing.simple) {
        const v7 = document.createElement('div');
        v7.appendChild(document.createTextNode(Formatting.cooldown_glance(context.cool_end)));
        v7.className = style['cool-info'];
        v4.appendChild(v7);

        const v8 = document.createElement('div');
        v8.appendChild(document.createTextNode(Formatting.minute_clock(context.length)));
        v8.className = style.length;
        v4.appendChild(v8);
      }
      if (User.id > 1) {
        const v9 = document.createElement('div');
        v9.className = style['rating-clear'];
        v4.appendChild(v9);

        const v10 = document.createElement('img');
        v10.setAttribute('src', `/static/images4/rating_clear.png`);
        v9.appendChild(v10);
      }
    }
    v4.appendChild(rating(context).$root);
    if (!MOBILE && !Sizing.simple) {
      const v11 = document.createElement('div');
      v11.appendChild(document.createTextNode(Formatting.rating(context.rating)));
      v11.className = style['rating-site'];
      v4.appendChild(v11);
    }
    if (!Sizing.simple && context.artists) {
      const v12 = document.createElement('div');
      v12.className = style.artists;
      v4.appendChild(v12);

      const v13 = context.artists.map((context) => {
        const v14 = document.createDocumentFragment();

        const v15 = document.createElement('a');
        v15.appendChild(document.createTextNode(context.name));
        v15.href = `#!/artist/` + context.id;
        v14.appendChild(v15);
        v12.appendChild(v14);
        
return { $root: v14 };
      });
    }
    if (!MOBILE) {
      if (!Sizing.simple) {
        if (context.url) {
          const v16 = document.createElement('a');
          v16.className = style.url;
          v16.href = context.url;
          v16.setAttribute('target', `_blank`);
          v4.appendChild(v16);
        } else {
          const v17 = document.createElement('div');
          v17.className = style['fake-url'];
          v4.appendChild(v17);
        }
      }

      const v18 = document.createElement('div');
      v18.className = style['detail-icon'];
      v4.appendChild(v18);

      const v19 = document.createElement('img');
      v19.setAttribute('src', `/static/images4/info.png`);
      v18.appendChild(v19);
    }
    v4.appendChild(fave(context).$root);

    const v20 = document.createElement('div');
    v20.appendChild(document.createTextNode(context.title));
    v20.className = style.title;
    v20.setAttribute('title', context.title);
    v4.appendChild(v20);
    v1.appendChild(v3);
    
return { row: v4, ratingClear: v10, artists: v13, detailIcon: v18, title: v20, $root: v3 };
  });
  
return { $root: v1, songs: v2 };
}
export { songTable };
