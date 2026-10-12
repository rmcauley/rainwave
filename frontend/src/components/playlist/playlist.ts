import type { Routes } from '../router/router';
import { router } from '../router/router';
import { AlbumList } from './lists/albumList';
import { ArtistList } from './lists/artistList';
import { GroupList } from './lists/groupList';
import { RequestLineList } from './lists/requestLineList';
import { playlistTemplate } from './playlist.template';

const routeToList = {
  album: 'albumList',
  artist: 'artistList',
  group: 'groupList',
  request_line: 'requestLineList',
} as const satisfies Partial<
  Record<keyof Routes, keyof ReturnType<typeof playlistTemplate> | undefined>
>;

const routeToTab = {
  album: 'albumTab',
  artist: 'artistTab',
  group: 'groupTab',
  request_line: 'requestLineTab',
} as const satisfies Record<
  keyof typeof routeToList,
  keyof ReturnType<typeof playlistTemplate> | undefined
>;

class Playlist {
  private currentRoute: keyof typeof routeToList | undefined;
  private template: ReturnType<typeof playlistTemplate>;
  private albumList: AlbumList;
  private artistList: ArtistList;
  private groupList: GroupList;
  private requestLineList: RequestLineList;

  constructor() {
    this.template = playlistTemplate(null);
    document.getElementById('main')!.appendChild(this.template.$root);

    this.albumList = new AlbumList();
    this.template.albumList.appendChild(this.albumList.template.$root);

    this.artistList = new ArtistList();
    this.template.artistList.appendChild(this.artistList.template.$root);

    this.groupList = new GroupList();
    this.template.groupList.appendChild(this.groupList.template.$root);

    this.requestLineList = new RequestLineList();
    this.template.requestLineList.appendChild(this.requestLineList.template.$root);

    router.addEventListener('album', this.onRoute);
    router.addEventListener('artist', this.onRoute);
    router.addEventListener('group', this.onRoute);
    router.addEventListener('request_line', this.onRoute);
  }

  private onRoute = ([newRoute, itemId]: [
    keyof typeof routeToList,
    itemId: number | undefined,
  ]): void => {
    if (this.currentRoute) {
      const currentTabKey = routeToTab[this.currentRoute];
      if (currentTabKey) {
        this.template[currentTabKey].classList.add('playlist-header-tabs-tab--open');
      }
      const currentListKey = routeToList[this.currentRoute];
      if (currentListKey) {
        this.template[currentListKey].classList.remove('playlist-list--open');
      }
    }
    this.template[routeToTab[newRoute]].classList.add('playlist-header-tabs-tab--open');
    this.template[routeToList[newRoute]].classList.add('playlist-list--open');
    this.currentRoute = newRoute;
    if (itemId) {
      this[routeToList[newRoute]].setOpenItem(itemId);
    }
    this[routeToList[newRoute]].startLoad();
  };

  // KEY NAV FORWARDING --------------------------------------------------------------------

  keyNavDown = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavDown();
    }
  };

  keyNavUp = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavUp();
    }
  };

  keyNavPageDown = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavPageDown();
    }
  };

  keyNavPageUp = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavPageUp();
    }
  };

  keyNavEnd = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavEnd();
    }
  };

  keyNavHome = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavHome();
    }
  };

  keyNavEnter = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavEnter();
    }
  };

  keyNavEscape = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavEscape();
    }
  };

  keyNavBlur = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavBlur();
    }
  };

  keyNavFocus = (): void => {
    if (this.currentRoute) {
      this[routeToList[this.currentRoute]].keyNavFocus();
    }
  };
}

export { Playlist };
