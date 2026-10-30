import { $l } from '../../../language';
import { makeSearchableString } from '../../../language/get-searchable-name';
import { api } from '../../../rainwaveApi/api';
import type { components } from '../../../rainwaveApi/rainwave-openapi';
import { navigateTo } from '../../router/navigateTo';
import { SearchList } from '../searchList/searchList';

type RequestLineListItem = components['schemas']['request_line'][number] & {
  id: number;
  name: string;
  nameSearchable: string;
};

class RequestLineList extends SearchList<RequestLineListItem> {
  loaded = true;

  constructor() {
    super();

    this.itemHeight = 65;
    this.template.noResultMessage.textContent = $l('nobody_in_line');

    api.addEventListener('request_line', this.#onRequestLineReceive);
  }

  startLoadApi = async (): Promise<void> => Promise.resolve();

  #onRequestLineReceive = (payload: components['schemas']['request_line']): void => {
    this.items = [];
    const newItems: RequestLineListItem[] = payload.map((lineItem) => {
      return {
        ...lineItem,
        id: lineItem.user_id,
        name: lineItem.username,
        nameSearchable: makeSearchableString(lineItem.username),
      };
    });
    // Delete stale items - the request line is not 'additive' like other search lists
    // where data is to be accumulated, the payload is a complete dataset and old
    // items need to be thrown out.
    this.items = [];
    this.itemById = new Map();
    this.addItems(newItems);
  };

  sortItems = (): void => {
    // no op, list is sorted from the server
  };

  renderItem = (item: RequestLineListItem): HTMLElement => {
    const element = document.createElement('div');
    element.className = 'item';

    const userElement = document.createElement('div');
    element.appendChild(userElement);

    const songTitleElement = document.createElement('div');
    songTitleElement.className = 'requestlist_song';
    element.appendChild(songTitleElement);

    const albumTitleElement = document.createElement('div');
    albumTitleElement.className = 'requestlist_album';
    element.appendChild(albumTitleElement);

    this.renderItemUpdate(item, element);
    return element;
  };

  renderItemUpdate = (item: RequestLineListItem, element: HTMLElement): void => {
    const [userElement, songTitleElement, albumTitleElement] = element.childNodes;

    if (item.skip || !item.song) {
      element.classList.add('skip');
    } else {
      element.classList.remove('skip');
    }

    userElement!.textContent = item.position + '. ' + item.username;

    if (item.song) {
      songTitleElement!.textContent = item.song.title;
      albumTitleElement!.textContent = item.song.album_name;
    } else {
      songTitleElement!.textContent = $l('no_song_selected');
      albumTitleElement!.textContent = '_';
    }
  };

  navigateToItem = (item: RequestLineListItem): void => {
    navigateTo('listener', item.id);
  };
}

export { RequestLineList };
