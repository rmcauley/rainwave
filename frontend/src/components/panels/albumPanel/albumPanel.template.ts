import { $l } from '../../../language';
import type { albumPanelContext } from './albumPanel.context';
function albumPanelTemplate(context: albumPanelContext) {
  const v1 = document.createElement('div');
  v1.className = 'album-panel';
  const v2 = document.createElement('div');
  v2.className = 'panel-header album-panel-header';
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
    v12 = v11;
  }
  if (context.album.rating_user) {
    const v13 = document.createElement('div');
    v13.appendChild(
      document.createTextNode($l('your_album_rating', { rating_user: context.album.rating_user })),
    );
    v2.appendChild(v13);
  }
  let v18: HTMLElementTagNameMap['div'] | undefined;
  if (context.album.rating_count) {
    const v14 = document.createElement('div');
    v2.appendChild(v14);
    const v15 = document.createElement('span');
    v15.appendChild(document.createTextNode($l('album_rating_detail')));
    v14.appendChild(v15);
    const v16 = document.createElement('span');
    v16.appendChild(
      document.createTextNode(
        $l('rating_detail_numbers', {
          rating: context.album.rating,
          count: context.album.rating_count,
          percentile: context.album.rating_rank_percentile,
          percentile_message: context.ratingPercentileMessage,
        }),
      ),
    );
    v14.appendChild(v16);
    const v17 = document.createElement('div');
    v14.appendChild(v17);
    v18 = v17;
  }
  if (context.album.genres.length > 0) {
    const v19 = document.createElement('div');
    v19.className = 'album-panel-header-categories';
    v2.appendChild(v19);
    const v20 = document.createElement('div');
    v20.appendChild(document.createTextNode($l('relevant_categories_rollover')));
    v19.appendChild(v20);
    const v21 = document.createElement('div');
    v21.className = 'album-panel-header-categories-list';
    v19.appendChild(v21);
    context.album.genres.forEach((context) => {
      const v22 = document.createElement('a');
      v22.appendChild(document.createTextNode(context.name));
      v22.href = `#!/group/` + context.id;
      v21.appendChild(v22);
    });
  }
  let v27: HTMLElementTagNameMap['a'] | undefined;
  let v28: HTMLElementTagNameMap['a'] | undefined;
  if (context.user.perks) {
    const v23 = document.createElement('div');
    v2.appendChild(v23);
    const v24 = document.createElement('a');
    v24.appendChild(document.createTextNode($l('fave_all_songs')));
    v24.className = 'fave-all-songs';
    v23.appendChild(v24);
    const v25 = document.createElement('span');
    v25.appendChild(document.createTextNode(`-`));
    v23.appendChild(v25);
    const v26 = document.createElement('a');
    v26.appendChild(document.createTextNode($l('unfave_all_songs')));
    v26.className = 'unfave-all-songs';
    v23.appendChild(v26);
    v27 = v24;
    v28 = v26;
  }
  const v29 = document.createElement('div');
  v29.className = 'album-art';
  v1.appendChild(v29);
  return {
    $root: v1,
    header: v2,
    albumCooldownExplanationLink: v12,
    ratingGraph: v18,
    faveAllSongs: v27,
    unfaveAllSongs: v28,
    art: v29,
  };
}
export { albumPanelTemplate };
