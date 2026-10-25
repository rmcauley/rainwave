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
  if (context.album.genres.length > 0) {
    const v20 = document.createElement('div');
    v20.className = 'album-panel-header-categories';
    v2.appendChild(v20);
    const v21 = document.createElement('div');
    v21.appendChild(document.createTextNode($l('relevant_categories_rollover')));
    v20.appendChild(v21);
    const v22 = document.createElement('div');
    v22.className = 'album-panel-header-categories-list';
    v20.appendChild(v22);
    context.album.genres.forEach((context) => {
      const v23 = document.createElement('a');
      v23.appendChild(document.createTextNode(context.name));
      v23.href = `#!/group/` + context.id;
      v22.appendChild(v23);
    });
  }
  let v28: HTMLElementTagNameMap['a'] | undefined;
  let v29: HTMLElementTagNameMap['a'] | undefined;
  if (context.user.perks) {
    const v24 = document.createElement('div');
    v2.appendChild(v24);
    const v25 = document.createElement('a');
    v25.appendChild(document.createTextNode($l('fave_all_songs')));
    v25.className = 'fave-all-songs';
    v24.appendChild(v25);
    const v26 = document.createElement('span');
    v26.appendChild(document.createTextNode(`-`));
    v24.appendChild(v26);
    const v27 = document.createElement('a');
    v27.appendChild(document.createTextNode($l('unfave_all_songs')));
    v27.className = 'unfave-all-songs';
    v24.appendChild(v27);
    v28 = v25;
    v29 = v27;
  }
  const v30 = document.createElement('div');
  v30.className = 'album-art';
  v1.appendChild(v30);
  return {
    $root: v1,
    header: v1,
    albumAllCooldown: v12,
    albumHasCooldown: v13,
    ratingGraph: v19,
    faveAllSongs: v28,
    unfaveAllSongs: v29,
    art: v30,
  };
}
export { albumPanelTemplate };
