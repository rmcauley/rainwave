import { preferences } from '../../preferences/preferences';
import { navigateTo } from '../router/navigateTo';
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

const firstTab = 'album';
const lastTab = 'request_line';
const routeOrder = [firstTab, 'artist', 'group', lastTab] as const satisfies Array<
  keyof typeof routeToList
>;

const navKeys: Set<KeyboardEvent['key']> = new Set([
  'Backspace',
  'Escape',
  'ArrowDown',
  'ArrowUp',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Tab',
]);
const fKeys = /^F\d+$/;
const searchChars = /^[\d\w\-.&':+~,]$/;

class Playlist {
  private currentRoute: keyof typeof routeToList | undefined;
  private albumList: AlbumList;
  private artistList: ArtistList;
  private groupList: GroupList;
  private requestLineList: RequestLineList;
  public template: ReturnType<typeof playlistTemplate>;

  constructor() {
    this.template = playlistTemplate(null);

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

    if (preferences.store.powerUserMode) {
      window.addEventListener('keydown', this.onKeyDown, { capture: true });
      window.addEventListener('keypress', this.onKeyPress, { capture: true });
    }
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

  // TAB KEY HANDLING ***********************************

  tabBackwards = (): void => {
    const nextRoute = this.currentRoute
      ? (routeOrder.at(routeOrder.indexOf(this.currentRoute) - 1) ?? lastTab)
      : lastTab;
    navigateTo(nextRoute, undefined);
  };

  tabForwards = (): void => {
    const nextRoute = this.currentRoute
      ? (routeOrder.at(routeOrder.indexOf(this.currentRoute) + 1) ?? firstTab)
      : firstTab;
    navigateTo(nextRoute, undefined);
  };

  // KEY NAV ***********************************

  private shouldProcessKeyboardEvent = (evt: KeyboardEvent): boolean => {
    if (evt.ctrlKey || evt.altKey || evt.metaKey) {
      return false;
    }

    if (fKeys.test(evt.key)) {
      return false;
    }

    return navKeys.has(evt.key) || searchChars.test(evt.key);
  };

  private routeKey = (evt: KeyboardEvent): void => {
    // Tab dopesn't require an open list
    if (evt.key === 'Tab') {
      if (evt.shiftKey) {
        this.tabBackwards();
      } else {
        this.tabForwards();
      }
      return;
    }

    if (!this.currentRoute) {
      return;
    }

    if (evt.key === 'ArrowDown') {
      this[routeToList[this.currentRoute]].keyNavDown();
      return;
    } else if (evt.key === 'ArrowUp') {
      this[routeToList[this.currentRoute]].keyNavUp();
      return;
    } else if (evt.key === 'Enter') {
      this[routeToList[this.currentRoute]].keyNavEnter();
      return;
    } else if (evt.key === 'PageDown') {
      this[routeToList[this.currentRoute]].keyNavPageDown();
      return;
    } else if (evt.key === 'PageUp') {
      this[routeToList[this.currentRoute]].keyNavPageUp();
      return;
    } else if (evt.key === 'Home') {
      this[routeToList[this.currentRoute]].keyNavHome();
      return;
    } else if (evt.key === 'End') {
      this[routeToList[this.currentRoute]].keyNavEnd();
      return;
    } else if (searchChars.test(evt.key) || evt.key === ' ') {
      this[routeToList[this.currentRoute]].keyNavAddCharacter(evt.key);
      return;
    } else if (evt.key === 'Backspace') {
      this[routeToList[this.currentRoute]].keyNavBackspace();
      return;
    } else if (evt.key === 'Escape') {
      this[routeToList[this.currentRoute]].keyNavEscape();
      return;
    }
  };

  private handleKeyboardEvent = (evt: KeyboardEvent): void => {
    const target = evt.target as HTMLElement | undefined;
    if (target?.tagName.toLowerCase() === 'input') {
      return;
    }

    this.routeKey(evt);
    evt.preventDefault();
  };

  private onKeyPress = (evt: KeyboardEvent): void => {
    if (!this.shouldProcessKeyboardEvent(evt)) {
      return;
    }

    if (!navKeys.has(evt.key)) {
      this.handleKeyboardEvent(evt);
    } else {
      evt.preventDefault();
    }
  };

  private onKeyDown = (evt: KeyboardEvent): void => {
    if (!this.shouldProcessKeyboardEvent(evt)) {
      return;
    }

    if (navKeys.has(evt.key)) {
      this.handleKeyboardEvent(evt);
      evt.preventDefault();
    }
  };
}

export { Playlist };
