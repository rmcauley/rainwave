import { makeSearchableString } from '../../../language/get-searchable-name';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { navigateTo } from '../../router/navigateTo';
import { SearchList } from '../searchList/searchList';

type ArtistListItem = components['schemas']['all_artists_paginated']['data'][number] & {
  nameSearchable: string;
};

class ArtistList extends SearchList<ArtistListItem> {
  constructor() {
    super();

    api.addEventListener('all_artists_paginated', this.#onPageReceive);
  }

  startLoadApi = (): Promise<unknown> => api.fetch('all_artists_paginated', {});

  #onPageReceive = (payload: components['schemas']['all_artists_paginated']): void => {
    this.template.loadingBar.style.transform = `scaleX(${(payload.progress * 0.8) / 100 + 0.2})`;
    if (payload.has_more) {
      api
        .fetch('all_artists_paginated', { after: payload.next })
        .catch((e) => this.showApiError(e));
    }
    const data = payload.data as ArtistListItem[];
    data.forEach(function (artist) {
      artist.nameSearchable = makeSearchableString(artist.name);
    });
    this.addItems(data);
    this.template.loadingBar.style.transform = `scaleX(${(payload.progress * 0.8) / 100 + 0.2})`;
    if (!payload.has_more) {
      this.onLoadFinish();
    }
  };

  renderItem = (item: ArtistListItem): HTMLElement => {
    const element = document.createElement('div');
    element.className = 'item';
    element.textContent = item.name;
    return element;
  };

  renderItemUpdate = (_item: ArtistListItem, _element: HTMLElement): void => {
    // Unnecessary for artists.
  };

  navigateToItem = (item: ArtistListItem): void => {
    navigateTo('artist', item.id);
  };
}

export { ArtistList };
