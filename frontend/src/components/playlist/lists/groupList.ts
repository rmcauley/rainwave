import { makeSearchableString } from '../../../language/get-searchable-name';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { navigateTo } from '../../router/navigateTo';
import { SearchList } from '../searchList/searchList';

type GroupListItem = components['schemas']['all_groups_paginated']['data'][number] & {
  nameSearchable: string;
};

class GroupList extends SearchList<GroupListItem> {
  constructor() {
    super();

    api.addEventListener('all_groups_paginated', this.#onPageReceive);
  }

  startLoadApi = (): Promise<unknown> => api.fetch('all_groups_paginated', {});

  #onPageReceive = (payload: components['schemas']['all_groups_paginated']): void => {
    this.template.loadingBar.style.transform = `scaleX(${(payload.progress * 0.8) / 100 + 0.2})`;
    if (payload.has_more) {
      api.fetch('all_groups_paginated', { after: payload.next }).catch((e) => this.showApiError(e));
    }
    const data = payload.data as GroupListItem[];
    data.forEach((artist) => {
      artist.nameSearchable = makeSearchableString(artist.name);
    });
    this.addItems(data);
    if (!payload.has_more) {
      this.onLoadFinish();
    }
  };

  renderItem = (item: GroupListItem): HTMLElement => {
    const element = document.createElement('div');
    element.className = 'item';
    element.textContent = item.name;
    return element;
  };

  renderItemUpdate = (_item: GroupListItem, _element: HTMLElement): void => {
    // Unnecessary for groups.
  };

  navigateToItem = (item: GroupListItem): void => {
    navigateTo('group', item.id);
  };
}

export { GroupList };
