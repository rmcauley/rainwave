import { $l } from '../../../language';

import type { albumDetailContext } from './albumDetail.context';

import style from './albumDetail.module.scss';
function albumDetail(context: albumDetailContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = style['art-anchor'];
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = style['art-container'];
  v2.appendChild(v3);
  const v4 = document.createElement('div');
  v4.className = style['detail-header'];
  v1.appendChild(v4);
  if (context.new_indicator) {
    const v5 = document.createElement('div');
    v5.appendChild(document.createTextNode(context.new_indicator));
    v5.setAttribute('data-old-class', context.new_indicator_class);
    v4.appendChild(v5);
  }
  if (context.all_cooldown) {
    const v6 = document.createElement('div');
    v6.className = style['album-all-cooldown'];
    v4.appendChild(v6);
    const v7 = document.createElement('span');
    v7.appendChild(document.createTextNode($l('album_all_cooldown')));
    v6.appendChild(v7);
    const v8 = document.createElement('sup');
    v8.appendChild(document.createTextNode(`?`));
    v6.appendChild(v8);
  } else {
    if (context.has_cooldown) {
      const v9 = document.createElement('div');
      v9.className = style['album-has-cooldown'];
      v4.appendChild(v9);
      const v10 = document.createElement('span');
      v10.appendChild(document.createTextNode($l('album_has_cooldown')));
      v9.appendChild(v10);
      const v11 = document.createElement('sup');
      v11.appendChild(document.createTextNode(`?`));
      v9.appendChild(v11);
    }
  }
  if (context.rating_user) {
    const v12 = document.createElement('div');
    v12.appendChild(
      document.createTextNode(
        $l('your_album_rating', { rating_user: Formatting.rating(context.rating_user) }),
      ),
    );
    v4.appendChild(v12);
  }
  if (context.rating_count) {
    const v13 = document.createElement('div');
    v4.appendChild(v13);
    const v14 = document.createElement('span');
    v14.appendChild(document.createTextNode($l('album_rating_detail')));
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
    v13.appendChild(v15);
    const v16 = document.createElement('div');
    v13.appendChild(v16);
  }
  if (context.genres.length && !MOBILE) {
    const v17 = document.createElement('div');
    v17.className = style.genres;
    v4.appendChild(v17);
    if (context.genres.length <= 2) {
      const v18 = document.createElement('span');
      v18.appendChild(document.createTextNode($l('relevant_category')));
      v17.appendChild(v18);
      const v19 = document.createElement('a');
      v19.appendChild(document.createTextNode(context.genres[0].name));
      v19.href = `#!/group/` + context.genres[0].id;
      v17.appendChild(v19);
      if (context.genres.length == 2) {
        const v20 = document.createElement('span');
        v20.appendChild(document.createTextNode(`,`));
        v20.setAttribute('style', `margin-right: 2px`);
        v17.appendChild(v20);
        const v21 = document.createElement('a');
        v21.appendChild(document.createTextNode(context.genres[1].name));
        v21.href = `#!/group/` + context.genres[1].id;
        v17.appendChild(v21);
      }
    } else {
      const v22 = document.createElement('div');
      v22.appendChild(document.createTextNode($l('relevant_categories_rollover')));
      v17.appendChild(v22);
      const v23 = document.createElement('div');
      v23.className = style['category-list'];
      v17.appendChild(v23);
      const v24 = context.genres.map((context) => {
        const v25 = document.createDocumentFragment();
        const v26 = document.createElement('a');
        v26.appendChild(document.createTextNode(context.name));
        v26.href = `#!/group/` + context.id;
        v25.appendChild(v26);
        v23.appendChild(v25);
        
return { $root: v25 };
      });
    }
  }
  if (User.perks) {
    const v27 = document.createElement('div');
    v4.appendChild(v27);
    const v28 = document.createElement('a');
    v28.appendChild(document.createTextNode($l('fave_all_songs')));
    v28.className = style['fave-all-songs'];
    v27.appendChild(v28);
    const v29 = document.createElement('span');
    v29.appendChild(document.createTextNode(`-`));
    v27.appendChild(v29);
    const v30 = document.createElement('a');
    v30.appendChild(document.createTextNode($l('unfave_all_songs')));
    v30.className = style['unfave-all-songs'];
    v27.appendChild(v30);
  }
  
return {
    $root: v1,
    art: v3,
    detail_header: v4,
    album_all_cooldown: v6,
    album_has_cooldown: v9,
    graph_placement: v16,
    category_rollover: v22,
    category_list: v23,
    genres: v24,
    fave_all_songs: v28,
    unfave_all_songs: v30,
  };
}
export { albumDetail };
