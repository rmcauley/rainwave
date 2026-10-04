import { isSimpleMode } from '../../../helpers/isSimpleMode.js';
import { makeSearchableString } from '../../../language/get-searchable-name.js';
import { preferences } from '../../../preferences/index.js';
import { searchListTemplate } from '../searchList/searchListTemplate.template.js';

type SearchListItem = {
  id: number;
  name: string;
  searchableName: string;
};

// 26px is a default from CSS, but recalculated at page load by initSearchList
// by a placeholder element measurement that happens on first paint before JS is loaded
let searchListItemHeight = 26;

function initSearchList(): void {
  searchListItemHeight = document.getElementById('measure-list-item')!.offsetHeight;
}

class SearchList<T extends SearchListItem> {
  #currentOpenItem: T | undefined;
  #height = 0;
  #itemById: Map<number, T> = new Map();
  #itemHeight: number;
  #items: Array<T> = [];
  #keyNavCurrentItem: T | undefined;
  #keyNavItemBeforeSearch: T | undefined;
  #loaded = false;
  #onLoadOpenItemId: number | undefined;
  #rafTimer: ReturnType<typeof requestAnimationFrame> | undefined;
  #renderElements: Array<HTMLElement> = [];
  #scrollCurrentVisibleIndex: number = 0;
  #scrollMargin = 5; // in items
  #scrollTop = 0;
  #scrollTopBeforeSearch: number | undefined;
  #searchString = '';
  #sortKey: keyof T;
  #template: ReturnType<typeof searchListTemplate>;
  #visibleItems: Array<T> = [];

  constructor(options: { root: HTMLElement; sortKey: keyof T }) {
    this.#sortKey = options.sortKey;

    this.#template = searchListTemplate({});
    options.root.appendChild(this.#template.$root);

    this.#itemHeight = searchListItemHeight;

    this.#template.cancel.addEventListener('click', this.onSearchCancelClick);
    if (!preferences.powerUserMode) {
      this.#template.searchBox.addEventListener('input', this.onSearchInput);
    }
    this.#template.list.addEventListener('scroll', this.#onScroll, { passive: true });

    window.addEventListener('resize', this.#onResize, { passive: true });

    requestAnimationFrame(() => {
      this.#height = this.#template.list.scrollHeight;
      this.#redraw();
    });
  }

  addItems = (newItems: Array<T>): void => {
    this.#items = this.#items.concat(newItems);
    newItems.forEach((item) => this.#itemById.set(item.id, item));
    this.#sortItems();
    this.#redrawDecoupled();
  };

  upsertItems = (newItems: Array<T>): void => {
    const toAdd: Array<T> = [];
    newItems.forEach((item) => {
      const existing = this.#itemById.get(item.id);
      if (existing) {
        Object.assign(existing, item);
      } else {
        toAdd.push(item);
      }
    });
    if (toAdd.length) {
      this.addItems(toAdd);
    } else {
      this.#redrawDecoupled();
    }
  };

  getTitleFromId = (id: number): string | undefined => {
    return this.#items[id]?.name;
  };

  #sortItems = (): void => {
    this.#items.sort((a, b) => {
      if (a[this.#sortKey] < b[this.#sortKey]) {
        return -1;
      } else if (a[this.#sortKey] > b[this.#sortKey]) {
        return 1;
      }

      return 0;
    });
  };

  #getNumItemsToDisplay = (): number => {
    return Math.ceil(this.#height / this.#itemHeight) + 1;
  };

  #redrawDecoupled = (): void => {
    if (!this.#rafTimer) {
      this.#rafTimer = requestAnimationFrame(this.#redraw);
    }
  };

  #redraw = (): void => {
    const fullHeight = this.#itemHeight * this.#visibleItems.length;
    if (fullHeight !== this.#height) {
      this.#template.stretcher.style.height = `${fullHeight}px`;
      this.#height = fullHeight;
    }

    // TODO: list rendering here
    // TODO: dataset.itemId must be set
    this.#rafTimer = undefined;
  };

  #onScroll = (): void => {
    if (this.#scrollTop !== this.#template.list.scrollTop) {
      this.#scrollTop = this.#template.list.scrollTop;
      this.#redrawDecoupled();
    }
  };

  #onResize = (): void => {
    this.#height = this.#template.list.scrollHeight;
    this.#redrawDecoupled();
  };

  onLoad = (): void => {
    this.#loaded = true;
    if (this.#onLoadOpenItemId) {
      this.open(this.#onLoadOpenItemId);
    }
  };

  // SEARCHING ****************************

  #keyNavRemoveHighlight = (): void => {
    if (this.#keyNavCurrentItem === undefined) {
      return;
    }
    const keyNavIdString = this.#keyNavCurrentItem.id.toString();
    const visibleHighlightedElement = this.#renderElements.find(
      (el) => el.dataset.itemId === keyNavIdString,
    );
    visibleHighlightedElement?.classList.remove('hover');
  };

  #keyNavSetCurrentItem = (newKeyNavItem: T | undefined): void => {
    if (!newKeyNavItem) {
      this.#keyNavRemoveHighlight();
      this.#keyNavCurrentItem = undefined;
      return;
    }

    if (newKeyNavItem === this.#keyNavCurrentItem) {
      return;
    }

    if (this.#keyNavCurrentItem) {
      this.#keyNavRemoveHighlight();
    }

    this.#keyNavItemBeforeSearch = undefined;
    this.#keyNavCurrentItem = newKeyNavItem;
    const keyNavIdString = newKeyNavItem.id.toString();
    const visibleElement = this.#renderElements.find((el) => el.dataset.itemId === keyNavIdString);
    visibleElement?.classList.add('hover');
    this.scrollTo(newKeyNavItem);
  };

  keyNavFirstItem = (): void => {
    const newKeyNavItem = this.#visibleItems[0];
    if (newKeyNavItem) {
      this.#keyNavSetCurrentItem(newKeyNavItem);
    }
  };

  keyNavLastItem = (): void => {
    const newKeyNavItem = this.#visibleItems.at(-1);
    if (newKeyNavItem) {
      this.#keyNavSetCurrentItem(newKeyNavItem);
    }
  };

  #keyNavArrowAction = (jump: number): void => {
    // If the user has not navigated by keyboard before or has had their
    // keyboard nav state reset, the index starts at -1 so that a jump of 1
    // (i.e. pressing the down arrow) causes the first item to be highlighted.
    let keyNavIndex = -1;
    if (this.#keyNavCurrentItem) {
      const currentItemIndex = this.#visibleItems.indexOf(this.#keyNavCurrentItem);
      if (currentItemIndex >= 0) {
        keyNavIndex = currentItemIndex;
      }
    }

    // Clamp to array boundaries
    keyNavIndex = Math.max(0, Math.min(keyNavIndex + jump, this.#visibleItems.length - 1));
    const newItem = this.#visibleItems.at(keyNavIndex);
    if (newItem) {
      this.#keyNavCurrentItem = newItem;
      this.#keyNavSetCurrentItem(newItem);
    }
  };

  keyNavDown = (): void => {
    return this.#keyNavArrowAction(1);
  };

  keyNavUp = (): void => {
    return this.#keyNavArrowAction(-1);
  };

  keyNavRight = (): void => {
    return;
  };

  keyNavLeft = (): void => {
    return;
  };

  keyNavPageDown = (): void => {
    return this.#keyNavArrowAction(Math.floor(this.#getNumItemsToDisplay() * 0.75));
  };

  keyNavPageUp = (): void => {
    return this.#keyNavArrowAction(Math.floor(this.#getNumItemsToDisplay() * 0.75));
  };

  keyNavEnd = (): void => {
    this.keyNavLastItem();
  };

  keyNavHome = (): void => {
    this.keyNavFirstItem();
  };

  keyNavEnter = (): void => {
    if (this.#keyNavCurrentItem) {
      this.open(this.#keyNavCurrentItem.id);
    }
  };

  keyNavEscape = (): void => {
    this.clearSearch();
  };

  keyNavBlur = (): void => {
    this.#keyNavRemoveHighlight();
  };

  keyNavFocus = (): void => {
    if (this.#keyNavCurrentItem) {
      this.#keyNavSetCurrentItem(this.#keyNavCurrentItem);
    }
  };

  #doSearch = (newValue: string): void => {
    if (newValue === this.#searchString) {
      return;
    }

    const useSearchString = makeSearchableString(this.#searchString);

    if (!useSearchString) {
      this.clearSearch();
      return;
    }

    const firstTime = this.#searchString.length === 0;
    if (firstTime) {
      this.#keyNavItemBeforeSearch = this.#keyNavCurrentItem;
      this.#keyNavRemoveHighlight();
      this.#scrollTopBeforeSearch = this.#scrollTop;
    }

    if (this.#searchString.length >= newValue.length) {
      // If user is backspacing, we have to recalculate the
      // visible list of items from scratch instead of narrowing down
      // from the currently visible list.
      this.#visibleItems = this.#items;
    } else if (!this.#searchString.startsWith(newValue)) {
      // If the user replaced their search string, detected by the new
      // search not being an extended version of the previous search,
      // we must restart the list filter from scratch instead of narrowing
      // down from the currently visible list.
      this.#visibleItems = this.#items;
    }

    this.#searchString = newValue;

    this.#visibleItems = this.#visibleItems.filter((item) =>
      item.searchableName.includes(useSearchString),
    );
    const scrollToItem = this.#visibleItems[0];

    this.#doSearchbarStyle();

    this.#redraw();

    this.scrollTo(scrollToItem);
  };

  clearSearch = (): void => {
    this.#searchString = '';

    this.#template.searchBox.value = '';
    this.#doSearchbarStyle();

    if (this.#keyNavItemBeforeSearch) {
      this.scrollTo(this.#keyNavItemBeforeSearch);
      this.#keyNavItemBeforeSearch = undefined;
    } else if (this.#scrollTopBeforeSearch !== undefined) {
      this.#scrollToPx(this.#scrollTopBeforeSearch);
      this.#scrollTopBeforeSearch = undefined;
    } else if (this.#currentOpenItem && this.#visibleItems.includes(this.#currentOpenItem)) {
      this.scrollTo(this.#currentOpenItem);
    }
  };

  keyNavBackspace = (): void => {
    if (this.#searchString.length === 1) {
      this.clearSearch();
    } else if (this.#searchString.length > 1) {
      this.#searchString = this.#searchString.slice(0, -1);
      this.#doSearch(this.#searchString);
    }
  };

  keyNavAddCharacter = (character: string): void => {
    this.#doSearch(this.#searchString + character);
  };

  onSearchCancelClick = (): void => {
    this.clearSearch();
    if (isSimpleMode()) {
      this.#template.searchBox.focus();
    }
  };

  onSearchInput = (): void => {
    this.#doSearch(this.#template.searchBox.value);
  };

  #doSearchbarStyle = (): void => {
    if (this.#searchString && this.#visibleItems.length === 0) {
      this.#template.searchBox.classList.add('error');
      this.#template.boxContainer.classList.add('search-error');
    } else {
      this.#template.searchBox.classList.remove('error');
      this.#template.boxContainer.classList.remove('search-error');
    }

    if (this.#searchString.length > 0) {
      if (isSimpleMode()) {
        this.#template.searchBox.value = this.#searchString;
      }
      this.#template.searchBox.classList.add('active');
      this.#template.boxContainer.classList.add('active');
    } else {
      this.#template.searchBox.classList.remove('active');
      this.#template.boxContainer.classList.remove('active');
    }

    this.#doSearchMessage();
  };

  // SCROLL **************************

  scrollToId = (itemId: number): void => {
    const item = this.#itemById.get(itemId);
    if (item) {
      this.scrollTo(item);
    }
  };

  #scrollToPx = (newScrollTopPx: number): void => {
    this.#scrollTop = newScrollTopPx;
    this.#redraw();
    this.#template.list.scrollTop = newScrollTopPx;
  };

  scrollTo = (item: T | undefined): void => {
    let newScrollTopPx: undefined | number = 0;
    if (item) {
      const newIndex = this.#visibleItems.indexOf(item);
      if (newIndex !== -1) {
        const numItemsToDisplay = this.#getNumItemsToDisplay();
        const topBoundaryIndex = this.#scrollCurrentVisibleIndex + this.#scrollMargin - 1;
        const bottomBoundaryIndex =
          this.#scrollCurrentVisibleIndex + numItemsToDisplay - this.#scrollMargin - 1;
        if (this.#visibleItems.length < numItemsToDisplay) {
          newScrollTopPx = 0;
        } else if (newIndex > topBoundaryIndex && newIndex < bottomBoundaryIndex) {
          newScrollTopPx = undefined;
        } else if (newIndex >= bottomBoundaryIndex) {
          newScrollTopPx = Math.min(
            this.#itemHeight * this.#visibleItems.length,
            (newIndex - numItemsToDisplay + this.#scrollMargin) * this.#itemHeight,
          );
        } else {
          newScrollTopPx = Math.max(0, (newIndex - this.#scrollMargin) * this.#itemHeight);
        }
      }
    }
    if (newScrollTopPx !== undefined) {
      this.#scrollToPx(newScrollTopPx);
    }
  };

  #doSearchMessage = (): void => {
    if (this.#searchString) {
      this.#template.list.classList.add('search-active');
    } else {
      this.#template.list.classList.remove('search-active');
    }

    if (this.#visibleItems.length === 0) {
      this.#template.list.classList.add('no-results');
    } else {
      this.#template.list.classList.remove('no-results');
    }
  };

  // NAV *****************************

  open = (itemId: number): void => {
    if (!this.#loaded) {
      this.#onLoadOpenItemId = itemId;
      return;
    }

    if (this.#currentOpenItem?.id === itemId) {
      return;
    }

    const visibleOpenedElement = this.#renderElements.find((el) => el.classList.contains('open'));
    visibleOpenedElement?.classList.add('hover');

    const newItem = this.#itemById.get(itemId);
    if (!newItem) {
      return;
    }

    const itemIdString = itemId.toString();
    const visibleOpenToElement = this.#renderElements.find(
      (el) => el.dataset.itemId === itemIdString,
    );
    visibleOpenToElement?.classList.add('hover');
    this.#keyNavCurrentItem = newItem;
    this.#keyNavItemBeforeSearch = undefined;
    this.#scrollTopBeforeSearch = undefined;
  };
}

export { SearchList, initSearchList };
