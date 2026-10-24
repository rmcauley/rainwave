import { $l } from '../../../language';
import type { albumPanelContext } from './albumPanel.context';
function albumPanelTemplate(context: albumPanelContext) {
  const v1 = document.createDocumentFragment();
  const v2 = document.createElement('div');
  v2.className = 'album-art';
  v1.appendChild(v2);
  const v3 = document.createElement('div');
  v3.className = 'album-panel';
  v1.appendChild(v3);
  if (context.isNew) {
    const v4 = document.createElement('div');
    v4.appendChild(document.createTextNode(`it's new!`));
    v4.className = 'album-panel-new-indicator';
    v3.appendChild(v4);
  }
  if (context.isAllOnCooldown) {
    const v5 = document.createElement('div');
    v5.className = 'album-all-cooldown';
    v3.appendChild(v5);
    const v6 = document.createElement('span');
    v6.appendChild(document.createTextNode($l('album_all_cooldown')));
    v5.appendChild(v6);
    const v7 = document.createElement('sup');
    v7.appendChild(document.createTextNode(`?`));
    v5.appendChild(v7);
  } else {
    if (context.hasCooldown) {
      const v8 = document.createElement('div');
      v8.className = 'album-has-cooldown';
      v3.appendChild(v8);
      const v9 = document.createElement('span');
      v9.appendChild(document.createTextNode($l('album_has_cooldown')));
      v8.appendChild(v9);
      const v10 = document.createElement('sup');
      v10.appendChild(document.createTextNode(`?`));
      v8.appendChild(v10);
    }
  }
  if (context.album.rating_user) {
    const v11 = document.createElement('div');
    v11.appendChild(
      document.createTextNode($l('your_album_rating', { rating_user: context.album.rating_user })),
    );
    v3.appendChild(v11);
  }
  if (context.album.rating_count) {
    const v12 = document.createElement('div');
    v3.appendChild(v12);
    const v13 = document.createElement('span');
    v13.appendChild(document.createTextNode($l('album_rating_detail')));
    v12.appendChild(v13);
    const v14 = document.createElement('span');
    v14.appendChild(
      document.createTextNode(
        $l('rating_detail_numbers', {
          rating: context.album.rating,
          count: context.album.rating_count,
          percentile: context.album.rating_rank_percentile,
          percentile_message: context.ratingPercentileMessage,
        }),
      ),
    );
    v12.appendChild(v14);
    const v15 = document.createElement('div');
    v12.appendChild(v15);
  }
  if (context.album.genres.length > 0) {
    const v16 = document.createElement('div');
    v16.className = 'album-panel-genres';
    v3.appendChild(v16);
    const v17 = document.createElement('div');
    v17.appendChild(document.createTextNode($l('relevant_categories_rollover')));
    v16.appendChild(v17);
    const v18 = document.createElement('div');
    v18.className = 'category-list';
    v16.appendChild(v18);
    const v19 = context.album.genres.map((context) => {
      const v20 = document.createDocumentFragment();
      const v21 = document.createElement('a');
      v21.appendChild(document.createTextNode(context.name));
      v21.href = `#!/group/` + context.id;
      v20.appendChild(v21);
      v18.appendChild(v20);
      return { $root: v20 };
    });
  }
  if (context.user.perks) {
    const v22 = document.createElement('div');
    v3.appendChild(v22);
    const v23 = document.createElement('a');
    v23.appendChild(document.createTextNode($l('fave_all_songs')));
    v23.className = 'fave-all-songs';
    v22.appendChild(v23);
    const v24 = document.createElement('span');
    v24.appendChild(document.createTextNode(`-`));
    v22.appendChild(v24);
    const v25 = document.createElement('a');
    v25.appendChild(document.createTextNode($l('unfave_all_songs')));
    v25.className = 'unfave-all-songs';
    v22.appendChild(v25);
  }
  return {
    $root: v1,
    art: v2,
    header: v3,
    albumAllCooldown: v5,
    albumHasCooldown: v8,
    graphPlacement: v15,
    genres: v19,
    categoryRollover: v17,
    categoryList: v18,
    faveAllSongs: v23,
    unfaveAllSongs: v25,
  };
}
export { albumPanelTemplate };
