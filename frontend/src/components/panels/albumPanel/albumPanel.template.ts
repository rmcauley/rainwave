import { $l } from '../../../language';
import type { albumPanelContext } from './albumPanel.context';
function albumPanelTemplate(context: albumPanelContext) {
  const v1 = document.createElement('div');
  v1.className = 'panel-header album-panel-header';
  const v2 = document.createElement('div');
  v1.appendChild(v2);
  if (context.isNew) {
    const v3 = document.createElement('div');
    v3.appendChild(document.createTextNode($l('new_album')));
    v3.className = 'album-panel-new-indicator';
    v2.appendChild(v3);
  }
  if (context.hasNewSongs) {
    const v4 = document.createElement('div');
    v4.appendChild(document.createTextNode($l('new_songs')));
    v4.className = 'album-panel-new-songs-indicator';
    v2.appendChild(v4);
  }
  let v12: HTMLElementTagNameMap['div'] | undefined;
  let v13: HTMLElementTagNameMap['div'] | undefined;
  if (context.isAllOnCooldown) {
    const v5 = document.createElement('div');
    v5.className = 'album-all-cooldown';
    v2.appendChild(v5);
    const v6 = document.createElement('span');
    v6.appendChild(document.createTextNode($l('album_all_cooldown')));
    v5.appendChild(v6);
    const v7 = document.createElement('sup');
    v7.appendChild(document.createTextNode(`?`));
    v5.appendChild(v7);
    v12 = v5;
  } else {
    let v11: HTMLElementTagNameMap['div'] | undefined;
    if (context.hasCooldown) {
      const v8 = document.createElement('div');
      v8.className = 'album-has-cooldown';
      v2.appendChild(v8);
      const v9 = document.createElement('span');
      v9.appendChild(document.createTextNode($l('album_has_cooldown')));
      v8.appendChild(v9);
      const v10 = document.createElement('sup');
      v10.appendChild(document.createTextNode(`?`));
      v8.appendChild(v10);
      v11 = v8;
    }
    v13 = v11;
  }
  if (context.album.rating_user) {
    const v14 = document.createElement('div');
    v14.appendChild(
      document.createTextNode($l('your_album_rating', { rating_user: context.album.rating_user })),
    );
    v2.appendChild(v14);
  }
  let v19: HTMLElementTagNameMap['div'] | undefined;
  if (context.album.rating_count) {
    const v15 = document.createElement('div');
    v2.appendChild(v15);
    const v16 = document.createElement('span');
    v16.appendChild(document.createTextNode($l('album_rating_detail')));
    v15.appendChild(v16);
    const v17 = document.createElement('span');
    v17.appendChild(
      document.createTextNode(
        $l('rating_detail_numbers', {
          rating: context.album.rating,
          count: context.album.rating_count,
          percentile: context.album.rating_rank_percentile,
          percentile_message: context.ratingPercentileMessage,
        }),
      ),
    );
    v15.appendChild(v17);
    const v18 = document.createElement('div');
    v15.appendChild(v18);
    v19 = v18;
  }
  let v26: HTMLElementTagNameMap['div'] | undefined;
  let v27: HTMLElementTagNameMap['div'] | undefined;
  let v28: Array<{ $root: DocumentFragment }> | undefined;
  if (context.album.genres.length > 0) {
    const v20 = document.createElement('div');
    v20.className = 'album-panel-header-genres';
    v2.appendChild(v20);
    const v21 = document.createElement('div');
    v21.appendChild(document.createTextNode($l('relevant_categories_rollover')));
    v20.appendChild(v21);
    const v22 = document.createElement('div');
    v22.className = 'category-list';
    v20.appendChild(v22);
    const v23 = context.album.genres.map((context) => {
      const v24 = document.createDocumentFragment();
      const v25 = document.createElement('a');
      v25.appendChild(document.createTextNode(context.name));
      v25.href = `#!/group/` + context.id;
      v24.appendChild(v25);
      v22.appendChild(v24);
      return { $root: v24 };
    });
    v26 = v21;
    v27 = v22;
    v28 = v23;
  }
  let v33: HTMLElementTagNameMap['a'] | undefined;
  let v34: HTMLElementTagNameMap['a'] | undefined;
  if (context.user.perks) {
    const v29 = document.createElement('div');
    v2.appendChild(v29);
    const v30 = document.createElement('a');
    v30.appendChild(document.createTextNode($l('fave_all_songs')));
    v30.className = 'fave-all-songs';
    v29.appendChild(v30);
    const v31 = document.createElement('span');
    v31.appendChild(document.createTextNode(`-`));
    v29.appendChild(v31);
    const v32 = document.createElement('a');
    v32.appendChild(document.createTextNode($l('unfave_all_songs')));
    v32.className = 'unfave-all-songs';
    v29.appendChild(v32);
    v33 = v30;
    v34 = v32;
  }
  const v35 = document.createElement('div');
  v35.className = 'album-art';
  v1.appendChild(v35);
  return {
    $root: v1,
    header: v1,
    albumAllCooldown: v12,
    albumHasCooldown: v13,
    ratingGraph: v19,
    categoryRollover: v26,
    categoryList: v27,
    genres: v28,
    faveAllSongs: v33,
    unfaveAllSongs: v34,
    art: v35,
  };
}
export { albumPanelTemplate };
