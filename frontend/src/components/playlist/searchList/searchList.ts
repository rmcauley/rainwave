import { searchListTemplate } from '../searchList/searchListTemplate.template.js';

type SearchListItem = {
  id: number;
  name: string;
  searchableName: string;
};

let searchListItemHeight = 26;

function initSearchList(): void {
  searchListItemHeight = document.getElementById('measure-list-item')!.offsetHeight;
}

// TODO: use passive listener
// TODO: use requestAnimationFrame to render after a scroll

class SearchList<T extends SearchListItem> {
  #currentOpenId: number | undefined;
  #height = 0;
  #itemById: Map<number, T> = new Map();
  #itemHeight: number;
  #items: Array<T> = [];
  #keyNavIdBeforeSearch: number | undefined;
  #keyNavCurrentId: number | undefined;
  #keyNavCurrentVisibleIndex: number | undefined;
  #listElements: Array<HTMLElement> = [];
  #loaded = false;
  #rafTimer: ReturnType<typeof requestAnimationFrame> | undefined;
  #redrawAfterRafBound: Parameters<typeof requestAnimationFrame>[0];
  #scrollCurrentVisibleIndex: number | undefined;
  #scrollMargin = 5;
  #scrollTopBeforeSearch = 0;
  #searchString = '';
  #sortKey: keyof T;
  #template: ReturnType<typeof searchListTemplate>;
  #visibleItems: Array<T> = [];

  constructor(options: { root: HTMLElement; sortKey: keyof T;  }) {
    this.#sortKey = options.sortKey;

    this.#template = searchListTemplate({});
    options.root.appendChild(this.#template.$root);

    this.#itemHeight = searchListItemHeight;

    this.#template.cancel.addEventListener('click', this.onSearchCancelClick.bind(this));
    this.#template.searchBox.addEventListener('input', this.onSearchInput.bind(this));
    this.#template.list.addEventListener('scroll', this.#redraw.bind(this), { passive: true });

    window.addEventListener('resize', this.#onResize.bind(this), { passive: true });

    this.#redrawAfterRafBound = this.#redrawAfterRaf.bind(this);
  }

  addItems(newItems: Array<T>): void {
    this.#items = this.#items.concat(newItems);
    newItems.forEach((item) => this.#itemById.set(item.id, item));
    this.#sortItems();
    this.#redraw();
  }

  upsertItems(newItems: Array<T>): void {
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
      this.#redraw();
    }
  }

  getTitleFromId(id: number): string | undefined {
    return this.#items[id]?.name;
  }

  #sortItems(): void {
    this.#items.sort((a, b) => {
      if (a[this.#sortKey] < b[this.#sortKey]) {
        return -1;
      } else if (a[this.#sortKey] > b[this.#sortKey]) {
        return 1;
      }

      return 0;
    });
  }

  #redraw(): void {
    if (!this.#rafTimer) {
      this.#rafTimer = requestAnimationFrame(this.#redrawAfterRafBound);
    }
  }

  #redrawAfterRaf(): void {
    const numItemsToDisplay = Math.ceil(this.#height / this.#itemHeight) + 1;
    // TODO: rendering here
    this.#rafTimer = undefined;
  }

  #onResize(): void {
    const fullHeight = this.#itemHeight * this.#visibleItems.length;
    if (fullHeight !== this.#height) {
      this.#template.stretcher.style.height = `${fullHeight}px`;
      this.#height = fullHeight;
    }
    this.#redraw();
  }

  // SEARCHING ****************************

  #removeKeyNavHighlight(): void {
    if (this.#keyNavCurrentId) {
      const isVisible = this.#listElements.find((el) => el.dataset.itemId);
      isVisible?.classList.remove('hover');
      this.#keyNavCurrentId = undefined;
    }
  }

  #keyNavHighlight(id: number | undefined): void {
    // TODO: This now requires a check to see if it's in the visible
    // list, to re-scroll if it's not.
    // this.#originalKeyNav = undefined;
    // this.removeKeyNavHighlight();
    // this.#currentKeyNavId = id;
    // data[currentKeyNavId]._el.classList.add('hover');
    // if (!noScroll) {
    //   list.scrollTo(data[id], true);
    // }
  }

  keyNavFirstItem(): void {
    this.#keyNavHighlight(this.#visibleItems[0]?.id);
  }

  keyNavLastItem(): void {
    this.#keyNavHighlight(this.#visibleItems.at(-1)?.id);
  }

  keyNavArrowAction(jump: number): void {
    this.#backspaceScrollTop = false;
    if (!this.#keyNavCurrentId) {
      this.keyNavFirstItem();
      return;
    }
    const currentIdx = this.#itemById.(currentKeyNavId);
    if (!currentIdx && currentIdx !== 0) {
      list.keyNavFirstItem();

      return;
    }
    const newIndex = Math.max(0, Math.min(currentIdx + jump, visible.length - 1));
    list.keyNavHighlight(visible[newIndex]);

    return true;
  }

  keyNavDown(): void {
    return keyNavArrowAction(1);
  }

  keyNavUp(): void {
    return keyNavArrowAction(-1);
  }

  keyNavRight(): void {
    return false;
  }

  keyNavLeft(): void {
    return false;
  }

  keyNavPageDown(): void {
    return this.keyNavArrowAction(15);
  }

  keyNavPageUp(): void {
    return this.keyNavArrowAction(-15);
  }

  keyNavEnd(): void {
    this.keyNavLastItem();
  }

  keyNavHome(): void {
    this.keyNavFirstItem();
  }

  keyNavEnter(): void {
    if (
      this.#keyNavCurrentId &&
      this.#keyNavCurrentId &&
      this.#itemById.get(currentKeyNavId)?._el
    ) {
      this.openElement({
        target: data[currentKeyNavId]._el,
        enter_key: true,
      });

      return true;
    }

    return false;
  }

  keyNavEscape(): void {
    if (this.#searchString.length > 0) {
      this.clearSearch();
    }

    return true;
  }

  keyNavBlur(): void {
    if (currentKeyNavId && data[currentKeyNavId]?._el) {
      data[currentKeyNavId]._el.classList.remove('hover');
    }
  }

  keyNavFocus(): void {
    if (currentKeyNavId && data[currentKeyNavId] && data[currentKeyNavId]) {
      data[currentKeyNavId]._el.classList.add('hover');
    }
  }

  keyNavBackspace(): void {
    if (searchString.length == 1) {
      list.clearSearch();

      return true;
    } else if (searchString.length > 1) {
      searchString = searchString.substring(0, searchString.length - 1);

      const useSearchString = Formatting.make_searchable_string(searchString);
      const revisible = [];
      for (let i = hidden.length - 1; i >= 0; i -= 1) {
        if (!data[hidden[i]]) {
          continue;
        }
        if (data[hidden[i]][searchKey].indexOf(useSearchString) != -1) {
          revisible.push(hidden.splice(i, 1)[0]);
        }
      }
      list.unhide(revisible);
      list.doSearchbarStyle();

      currentScrollIndex = false;
      list.recalculate();
      if (backspaceScrollTop && revisible.length + visible.length > numItemsToDisplay) {
        list.scrollTo(backspaceScrollTop);
        backspaceScrollTop = null;
      }
      list.reposition();

      return true;
    }

    return false;
  }

  doSearch(newString): void {
    const firstTime = searchString.length === 0 ? true : false;
    if (firstTime) {
      originalKeyNav = currentKeyNavId;
      list.removeKeyNavHighlight();
    }
    searchString = newString;
    const useSearchString = Formatting.make_searchable_string(searchString);
    const newVisible = [];
    for (let i = 0; i < visible.length; i += 1) {
      if (!data[visible[i]]) {
        continue;
      }
      if (data[visible[i]][searchKey].indexOf(useSearchString) == -1) {
        hidden.push(visible[i]);
      } else {
        newVisible.push(visible[i]);
      }
    }
    visible = newVisible;
    if (!visible.indexOf(currentKeyNavId)) {
      list.removeKeyNavHighlight();
    }
    currentScrollIndex = false;
    if (firstTime) {
      originalScrollTop = scroll.scroll_top;
      list.recalculate();
      scroll.scroll_to(0);
    } else if (visible.length <= numItemsToDisplay) {
      backspaceScrollTop = scroll.scroll_top;
      list.recalculate();
      scroll.scroll_to(0);
    } else if (visible.length <= currentScrollIndex) {
      backspaceScrollTop = scroll.scroll_top;
      list.recalculate();
      scroll.scroll_to(
        (visible.length - numItemsToDisplay) * (list.listItemHeight || Sizing.listItemHeight),
      );
    } else {
      list.recalculate();
    }
    list.reposition();
    list.doSearchbarStyle();
  }

  keyNavAddCharacter(character): void {
    doSearch(searchString + character);

    return true;
  }

  clearSearch(): void {
    backspaceScrollTop = null;
    searchString = '';
    searchBox.value = '';
    list.doSearchbarStyle();
    if (hidden.length === 0) {
      return;
    }
    list.unhide();

    currentScrollIndex = false;
    list.recalculate();
    if (originalKeyNav) {
      list.keyNavHighlight(originalKeyNav, true);
      originalKeyNav = false;
    }
    if (originalScrollTop && !ignoreOriginalScrollTop) {
      scroll.scroll_to(originalScrollTop);
      originalScrollTop = false;
    } else {
      list.scrollToDefault();
    }
    ignoreOriginalScrollTop = false;
  }

  onSearchCancelClick(): void {
    list.clearSearch();
    template.search_box.focus();
  }

  onSearchInput(): void {
    if (!searchBox.value.length) {
      list.clearSearch();
    } else {
      if (searchBox.value.length < searchString.length) {
        list.unhide();
      } else if (searchBox.value.substring(0, searchString.length) !== searchString) {
        list.unhide();
      }
      doSearch(searchBox.value);
    }
  }

  doSearchbarStyle(): void {
    if (searchString && visible.length === 0) {
      searchBox.classList.add('error');
      template.box_container.classList.add('search-error');
    } else {
      searchBox.classList.remove('error');
      template.box_container.classList.remove('search-error');
    }

    if (searchString.length > 0) {
      if (!Sizing.simple) {
        searchBox.value = searchString;
      }
      searchBox.classList.add('active');
      template.box_container.classList.add('active');
    } else {
      searchBox.classList.remove('active');
      template.box_container.classList.remove('active');
    }

    list.doSearchMessage();
  }

  // SCROLL **************************

  scrollToId(id): void {
    if (id in data) {
      list.scrollTo(data[id]);
    } else if (!list.loaded) {
      scrollToOnLoad = id;
    }
  }

  scrollAfterLoad(): void {
    searchBox.setAttribute('placeholder', $l('Filter...'));
    searchBox.removeAttribute('disabled');
    list.recalculate();
    if (openToOnLoad) {
      if (!list.setNewOpen(openToOnLoad)) {
        list.reposition();
      }
      openToOnLoad = null;
    } else if (scrollToOnLoad) {
      list.scrollToId(scrollToOnLoad);
      scrollToOnLoad = null;
    } else {
      list.reposition();
    }
  }

  scrollTo(dataItem): void {
    if (dataItem) {
      let newIndex = visible.indexOf(dataItem.id);
      if (newIndex === -1) {
        list.clearSearch();
        newIndex = visible.indexOf(dataItem.id);
      }

      if (
        newIndex > currentScrollIndex + scrollMargin - 1 &&
        newIndex < currentScrollIndex + numItemsToDisplay - scrollMargin - 1
      ) {
        if (!currentScrollIndex) {
          list.redrawCurrentPosition();
        }
      }
      // position at the lower edge
      else if (
        currentScrollIndex &&
        newIndex >= currentScrollIndex + numItemsToDisplay - scrollMargin - 1
      ) {
        scroll.scroll_to(
          Math.min(
            scroll.scroll_top_max,
            (newIndex - numItemsToDisplay + scrollMargin + 2) *
              (list.listItemHeight || Sizing.listItemHeight),
          ),
        );
      }
      // position at the higher edge
      else {
        scroll.scroll_to(
          Math.max(
            0,
            (newIndex - scrollMargin + 1) * (list.listItemHeight || Sizing.listItemHeight),
          ),
        );
      }
    }
  }

  scrollToDefault(): void {
    if (currentKeyNavId && visible.indexOf(currentKeyNavId)) {
      list.scrollTo(data[currentKeyNavId]);
    } else if (currentOpenId && visible.indexOf(currentOpenId)) {
      currentKeyNavId = currentOpenId;
      list.scrollTo(data[currentOpenId]);
    } else {
      list.reposition();
    }
  }

  redrawCurrentPosition(): void {
    currentScrollIndex = false;
    list.reposition();
  }

  doSearchMessage(): void {
    if (visible.length === 0 && searchString) {
      template._root.classList.add('no-results');

      template._root.classList.add('search-active');
    } else if (visible.length === 0 && itemsToDraw.length === 0) {
      template._root.classList.add('no-results');
      template._root.classList.remove('search-active');
    } else {
      template._root.classList.remove('no-results');
      template._root.classList.remove('search-active');
    }
  }

  reposition(): void {
    if (numItemsToDisplay === undefined) {
      return;
    }
    let newIndex = Math.floor(scroll.scroll_top / (list.listItemHeight || Sizing.listItemHeight));
    newIndex = Math.max(0, Math.min(newIndex, visible.length - numItemsToDisplay));

    let newMargin = scroll.scroll_top - (list.listItemHeight || Sizing.listItemHeight) * newIndex;
    newMargin = newMargin ? -newMargin : 0;
    list.doSearchMessage();
    list.el.style[Fx.transform] = `translateY(${scroll.scroll_top + newMargin}px)`;

    if (currentScrollIndex === newIndex) {
      return;
    }
    if (visible.length === 0 && hidden.length === 0) {
      if (list.autoTrim) {
        while (list.el.firstChild) {
          list.el.removeChild(list.el.lastChild);
        }
      }

      return;
    }

    if (currentScrollIndex) {
      if (newIndex < currentScrollIndex - numItemsToDisplay) {
        currentScrollIndex = false;
      } else if (newIndex > currentScrollIndex + numItemsToDisplay * 2) {
        currentScrollIndex = false;
      }
    }

    let i;
    // full reset
    if (!currentScrollIndex) {
      while (list.el.firstChild) {
        list.el.removeChild(list.el.lastChild);
      }
      for (i = newIndex; i < newIndex + numItemsToDisplay && i < visible.length; i += 1) {
        if (!data[visible[i]]._el) {
          list.drawEntry(data[visible[i]]);
        }
        list.el.appendChild(data[visible[i]]._el);
      }
    }
    // scrolling up
    else if (newIndex < currentScrollIndex) {
      for (i = currentScrollIndex; i >= newIndex; i -= 1) {
        if (!data[visible[i]]._el) {
          list.drawEntry(data[visible[i]]);
        }
        list.el.insertBefore(data[visible[i]]._el, list.el.firstChild);
      }
      while (list.el.childNodes.length > numItemsToDisplay) {
        list.el.removeChild(list.el.lastChild);
      }
    }
    // scrolling down (or starting fresh)
    else if (newIndex > currentScrollIndex) {
      for (
        i = currentScrollIndex + numItemsToDisplay;
        i < newIndex + numItemsToDisplay && i < visible.length;
        i++
      ) {
        if (!data[visible[i]]._el) {
          list.drawEntry(data[visible[i]]);
        }
        list.el.appendChild(data[visible[i]]._el);
      }
      while (list.el.childNodes.length > Math.min(visible.length - newIndex, numItemsToDisplay)) {
        list.el.removeChild(list.el.firstChild);
      }
    }
    currentScrollIndex = newIndex;
  }

  // NAV *****************************

  setNewOpen(id): void {
    if (!list.loaded) {
      openToOnLoad = id;

      return false;
    }
    if (currentOpenId && data[currentOpenId] && currentOpenId == id) {
      return false;
    }
    if (currentOpenId && data[currentOpenId]) {
      data[currentOpenId]._el.classList.remove('open');
      currentOpenId = null;
    }
    currentOpenId = id;
    if (!id || !(id in data)) {
      return;
    }
    if (!data[id]._el) {
      list.drawEntry(data[id]);
    }
    data[id]._el.classList.add('open');
    list.keyNavHighlight(id);
    if (searchString.length > 0) {
      ignoreOriginalScrollTop = true;
    }

    return true;
  }
}

export { SearchList, initSearchList };
