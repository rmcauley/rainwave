import { getServerTime } from '../../../helpers/clock';
import { removeElement } from '../../../helpers/removeElement';
import { makeSearchableString } from '../../../language/get-searchable-name';
import { preferences } from '../../../preferences';
import { api } from '../../../rainwaveApi';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { renderFave } from '../../fave/fave';
import { isPlaylistItemNew } from '../isPlaylistItemNew';
import type { SearchListOptions } from '../searchList/searchList';
import { SearchList } from '../searchList/searchList';

type AlbumListItem = components['schemas']['all_albums_paginated']['data'][number] & {
  nameSearchable: string;
};

class AlbumList extends SearchList<AlbumListItem> {
  constructor(options: SearchListOptions) {
    super(options);
    this.template.list.classList.add('album-list-core');

    preferences.addEventListener('playlistAvailableFirst', this.prefsUpdate);
    preferences.addEventListener('playlistFavesFirst', this.prefsUpdate);
    preferences.addEventListener('playlistSort', this.prefsUpdate);
    preferences.addEventListener('playlistUnratedFirst', this.prefsUpdate);
    preferences.addEventListener('indicateIncompleteAlbums', this.redrawDecoupled);

    api.addEventListener('all_albums_paginated', this.#onPageReceive);
    api.addEventListener('album_diff', this.#onAlbumDiff);
  }

  sortItemsByRating = (): void => {
    const { playlistUnratedFirst, playlistFavesFirst, playlistAvailableFirst, playlistSort } =
      preferences.store;

    this.items.sort((a, b) => {
      if (playlistUnratedFirst) {
        if (a.rating_complete && !b.rating_complete) {
          return 1;
        } else if (!a.rating_complete && b.rating_complete) {
          return -1;
        }
      }

      if (playlistFavesFirst) {
        if (a.fave && !b.fave) {
          return -1;
        } else if (!a.fave && b.fave) {
          return 1;
        }
      }

      if (playlistAvailableFirst) {
        if (a.cool && !b.cool) {
          return 1;
        } else if (!a.cool && b.cool) {
          return 1;
        }
      }

      if (playlistSort === 'rating') {
        const aRating = a.rating_user || a.rating;
        const bRating = b.rating_user || b.rating;
        if (aRating > bRating) {
          return -1;
        } else if (aRating < bRating) {
          return 1;
        }
      }

      if (a.nameSearchable > b.nameSearchable) {
        return 1;
      } else if (a.nameSearchable < b.nameSearchable) {
        return -1;
      }

      return 0;
    });
  };

  prefsUpdate = (): void => {
    if (this.loaded) {
      this.sortItems();
      this.redrawDecoupled();
    }
  };

  #onPageReceive = (payload: components['schemas']['all_albums_paginated']): void => {
    this.template.loadingBar.style.transform = `scaleX(${(payload.progress * 0.8) / 100 + 0.2})`;
    if (payload.has_more) {
      api.fetch('all_albums_paginated', { after: payload.next }).catch((e) => this.showApiError(e));
    }
    const data = payload.data as AlbumListItem[];
    data.forEach((album) => (album.nameSearchable = makeSearchableString(album.name)));
    this.addItems(data);
    if (!payload.has_more) {
      removeElement(this.template.loadingBar, 500);
      this.onLoad();
    }
  };

  startLoad = (): void => {
    if (!this.loaded) {
      this.template.loadingBar.style.display = 'block';
      this.template.loadingBar.style.opacity = '1';
      this.template.loadingBar.style.transform = 'scaleX(0)';
      requestAnimationFrame(() => {
        this.template.loadingBar.style.transform = 'scaleX(0.2)';
      });
      api.fetch('all_albums_paginated', {}).catch(this.showApiError);
    }
  };

  #onAlbumDiff = (payload: components['schemas']['album_diff']): void => {
    const toUpsert: AlbumListItem[] = [];
    payload.forEach((albumDiff) => {
      const listItem = this.itemById.get(albumDiff.id);
      if (listItem) {
        toUpsert.push({
          ...listItem,
          cool: albumDiff.cool,
          cool_lowest: albumDiff.cool_lowest,
          newest_song_time: albumDiff.newest_song_time,
        });
      }
    });
    this.upsertItems(toUpsert);
  };

  updateRating = (payload: components['schemas']['rate_result']): void => {
    const toUpsert: AlbumListItem[] = [];
    payload.updated_album_ratings.forEach((albumRating) => {
      const listItem = this.itemById.get(albumRating.id);
      if (listItem) {
        toUpsert.push({
          ...listItem,
          rating_complete: albumRating.rating_complete,
          rating_user: albumRating.rating_user,
        });
      }
    });
    this.upsertItems(toUpsert);
  };

  updateFave = (payload: components['schemas']['fave_album_result']): void => {
    const listItem = this.itemById.get(payload.id);
    if (listItem) {
      this.upsertItems([
        {
          ...listItem,
          fave: payload.fave,
        },
      ]);
    }
  };

  renderItem = (item: AlbumListItem): HTMLElement => {
    const element = document.createElement('div');
    element.classList.add('item');
    if (isPlaylistItemNew(item.newest_song_time)) {
      element.classList.add('has_new');
    }

    element.appendChild(renderFave(element, item.id, true, item.fave).$root);

    const span = document.createElement('span');
    span.className = 'name';
    span.textContent = item.name;
    element.appendChild(span);

    this.renderItemUpdate(item, element);

    return element;
  };

  renderItemUpdate = (item: AlbumListItem, element: HTMLElement): void => {
    // If you look above at renderItem, faveEl is the first appended child of the div.
    const faveEl = element.firstChild as HTMLElement;

    faveEl.classList.remove('fave-clicked');
    if (item.fave) {
      element.classList.add('album-fave-highlight');
      faveEl.classList.add('is-fave');
    } else {
      element.classList.remove('album-fave-highlight');
      faveEl.classList.remove('is-fave');
    }

    if (item.cool && item.cool_lowest > getServerTime()) {
      element.classList.add('cool');
    } else {
      element.classList.remove('cool');
    }

    if (item.rating_complete) {
      element.classList.remove('rating-incomplete');
    } else {
      element.classList.add('rating-incomplete');
    }

    if (item.rating_user) {
      element.classList.add('rating-user');
      element.style.backgroundPosition = `right ${-(Math.round(Math.round(item.rating_user * 10) / 2) * 28) + 6}px`;
    } else {
      element.classList.remove('rating-user');
      if (preferences.store.hideGlobalRatings || !item.rating) {
        element.style.backgroundPosition = 'right 6px';
      } else {
        element.style.backgroundPosition = `right ${-(Math.round(Math.round(item.rating * 10) / 2) * 28) + 6}px`;
      }
    }
  };
}

export { AlbumList };
